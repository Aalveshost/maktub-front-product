<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Maktub_API_Handler {

    public function __construct() {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes() {
        register_rest_route( 'maktub/v1', '/products', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_products' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);

        register_rest_route( 'maktub/v1', '/product/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_product' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);

        register_rest_route( 'maktub/v1', '/product/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => [ $this, 'update_product' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);

        // BATCH UPDATE ROUTE v1.3.16
        register_rest_route( 'maktub/v1', '/batch-update', [
            'methods' => 'POST',
            'callback' => [ $this, 'batch_update' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);
    }

    public function check_permission() {
        return current_user_can( 'manage_options' ) || current_user_can( 'administrator' ) || current_user_can( 'shop_manager' );
    }

    public function get_products() {
        $args = [
            'post_type' => 'maktub',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ];

        $query = new WP_Query( $args );
        $products = [];

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $id = get_the_ID();
                
                // Get Price from Jet Engine / WooCommerce
                $price = get_post_meta( $id, 'preco', true );
                if(empty($price)) $price = get_post_meta($id, '_price', true);

                // Get Status (Normalized to 1 or 0)
                $status_raw = get_post_meta( $id, 'status', true ); // Jet Engine field
                $status = ($status_raw === 'Disponível' || $status_raw === '1' || $status_raw === 1) ? '1' : '0';

                // Get category
                $terms = get_the_terms( $id, 'maktub-categorias' );
                $cat_slug = ($terms && !is_wp_error($terms)) ? $terms[0]->slug : '';

                $products[] = [
                    'id' => $id,
                    'title' => get_the_title(),
                    'price' => $price,
                    'status' => $status,
                    'cat' => $cat_slug,
                ];
            }
        }
        wp_reset_postdata();

        $categories = get_terms([
            'taxonomy' => 'maktub-categorias',
            'hide_empty' => false,
        ]);

        return [
            'products' => $products,
            'categories' => $categories
        ];
    }

    public function get_product( $request ) {
        $id = $request['id'];
        
        $price = get_post_meta( $id, 'preco', true );
        if(empty($price)) $price = get_post_meta($id, '_price', true);
        
        $status_raw = get_post_meta( $id, 'status', true );
        $status = ($status_raw === 'Disponível' || $status_raw === '1' || $status_raw === 1) ? '1' : '0';

        return [
            'id' => $id,
            'title' => get_the_title($id),
            'preco' => $price,
            'status' => $status,
            'descricao' => get_post_meta( $id, 'descricao', true ),
        ];
    }

    public function update_product( $request ) {
        $id = $request['id'];
        $params = $request->get_params();

        if ( isset( $params['preco'] ) ) {
            update_post_meta( $id, 'preco', $params['preco'] );
            update_post_meta( $id, '_price', $params['preco'] );
            update_post_meta( $id, '_regular_price', $params['preco'] );
        }

        if ( isset( $params['status'] ) ) {
            update_post_meta( $id, 'status', $params['status'] );
        }

        if ( isset( $params['descricao'] ) ) {
            update_post_meta( $id, 'descricao', $params['descricao'] );
        }

        return [ 'success' => true, 'message' => 'Produto atualizado' ];
    }

    public function batch_update( $request ) {
        $params = $request->get_params();
        $cat_slug = isset($params['category']) ? $params['category'] : '';
        
        if ( empty($cat_slug) ) {
            return new WP_Error( 'no_cat', 'Categoria não informada', [ 'status' => 400 ] );
        }

        $args = [
            'post_type' => 'maktub',
            'posts_per_page' => -1,
            'tax_query' => [
                [
                    'taxonomy' => 'maktub-categorias',
                    'field' => 'slug',
                    'terms' => $cat_slug,
                ]
            ]
        ];

        $query = new WP_Query($args);
        $updated_count = 0;

        if ( $query->have_posts() ) {
            while ( $query->have_posts() ) {
                $query->the_post();
                $id = get_the_ID();
                $title = get_the_title($id);

                // SAFETY: Skip items with "Mini" in the title v1.3.16
                if ( stripos($title, 'Mini') !== false ) {
                    continue;
                }

                if ( isset( $params['preco'] ) ) {
                    update_post_meta( $id, 'preco', $params['preco'] );
                    update_post_meta( $id, '_price', $params['preco'] );
                    update_post_meta( $id, '_regular_price', $params['preco'] );
                }

                if ( isset( $params['status'] ) ) {
                    update_post_meta( $id, 'status', $params['status'] );
                }

                $updated_count++;
            }
        }
        wp_reset_postdata();

        return [ 'success' => true, 'updated_count' => $updated_count ];
    }
}
