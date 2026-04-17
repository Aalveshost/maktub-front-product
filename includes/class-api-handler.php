<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Maktub_API_Handler {

    public function __construct() {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes() {
        register_rest_route( 'maktub/v2', '/products', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_products' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);

        register_rest_route( 'maktub/v2', '/product/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_product' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);

        register_rest_route( 'maktub/v2', '/product/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => [ $this, 'update_product' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);
    }

    public function check_permission() {
        return current_user_can( 'manage_options' ) || current_user_can( 'administrator' ) || current_user_can( 'shop_manager' );
    }

    private function is_active( $value ) {
        // CASE 1: Totally empty, null or false
        if ( empty($value) || $value === false || $value === 'false' || $value === '0' ) {
            return false;
        }
        
        // CASE 2: Jet Engine Checkbox (usually an array)
        if ( is_array($value) ) {
            // Check if 'Disponível' is explicitly present
            return in_array('Disponível', $value, true) || in_array('1', $value) || in_array('true', $value);
        }
        
        // CASE 3: String value
        $v = trim( (string) $value );
        
        // Handle serialized strings that might have escaped get_post_meta deserialization
        if ( strpos($v, 'a:') === 0 && strpos($v, '{') !== false ) {
            $unserialized = @unserialize($v);
            if ( is_array($unserialized) ) {
                return in_array('Disponível', $unserialized, true);
            }
        }

        return ( $v === 'Disponível' || $v === '1' || $v === 'true' || $v === 'on' );
    }

    public function get_products() {
        $products = [];
        $args = [
            'post_type' => 'maktub',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ];

        $posts = get_posts( $args );

        foreach ( $posts as $post ) {
            $id = $post->ID;
            
            $price = get_post_meta( $id, 'preco', true );
            if(empty($price)) $price = get_post_meta($id, '_price', true);
            
            // USE STRICT DETECTION
            $status_raw = get_post_meta( $id, 'status', true );
            $status = $this->is_active($status_raw) ? '1' : '0';

            $terms = get_the_terms( $id, 'maktub-categorias' );
            $cat_slug = ($terms && !is_wp_error($terms)) ? $terms[0]->slug : '';

            $products[] = [
                'id' => $id,
                'title' => $post->post_title,
                'price' => $price,
                'status' => $status,
                'cat' => $cat_slug,
            ];
        }

        $categories = get_terms([
            'taxonomy' => 'maktub-categorias',
            'hide_empty' => false,
        ]);

        return [
            'products' => $products,
            'categories' => is_wp_error($categories) ? [] : $categories
        ];
    }

    public function get_product( $request ) {
        $id = $request['id'];
        $price = get_post_meta( $id, 'preco', true );
        $status_raw = get_post_meta( $id, 'status', true );
        $status = $this->is_active($status_raw) ? '1' : '0';

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
            $price = sanitize_text_field( $params['preco'] );
            update_post_meta( $id, 'preco', $price );
            update_post_meta( $id, '_price', $price );
            update_post_meta( $id, '_regular_price', $price );
        }

        if ( isset( $params['status'] ) ) {
            // Save exactly in the format Jet Engine expects for a checked/unchecked checkbox
            if ( $params['status'] === 'Disponível' ) {
                update_post_meta( $id, 'status', ['Disponível'] );
            } else {
                // To effectively "uncheck" in Jet Engine, empty array is usually the way
                update_post_meta( $id, 'status', [] );
            }
        }

        if ( isset( $params['descricao'] ) ) {
            update_post_meta( $id, 'descricao', sanitize_textarea_field( $params['descricao'] ) );
        }

        clean_post_cache( $id );
        
        return [ 'success' => true ];
    }
}
