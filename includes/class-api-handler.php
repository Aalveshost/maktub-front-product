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
            'permission_callback' => '__return_true',
        ]);

        register_rest_route( 'maktub/v2', '/product/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_product' ],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route( 'maktub/v2', '/product/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => [ $this, 'update_product' ],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route( 'maktub/v2', '/product', [
            'methods' => 'POST',
            'callback' => [ $this, 'create_product' ],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route( 'maktub/v2', '/upload', [
            'methods'  => 'POST',
            'callback' => [ $this, 'upload_image' ],
            'permission_callback' => '__return_true',
        ]);

        // INVENTORY BULK ROUTES
        register_rest_route( 'maktub/v2', '/inventory', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_inventory' ],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route( 'maktub/v2', '/inventory/toggle', [
            'methods' => 'POST',
            'callback' => [ $this, 'toggle_ingredient' ],
            'permission_callback' => '__return_true',
        ]);
    }

    private function is_active( $id ) {
        $meta = get_post_meta( $id, 'status', true );
        if ( empty($meta) ) return false;
        if ( is_array($meta) ) {
            foreach($meta as $val) {
                $v = strtolower(trim((string)$val));
                if ($v === 'disponivel' || $v === '1' || $v === 'true') return true;
            }
            return false;
        }
        if ( is_serialized($meta) ) {
            $unserialized = @unserialize($meta);
            if ( is_array($unserialized) ) {
                foreach($unserialized as $val) {
                    $v = strtolower(trim((string)$val));
                    if ($v === 'disponivel' || $v === '1' || $v === 'true') return true;
                }
            }
            return false;
        }
        $v = strtolower(trim((string)$meta));
        return ( $v === 'disponivel' || $v === '1' || $v === 'true' || $v === 'on' );
    }

    public function get_products() {
        $products = [];
        $posts = get_posts([
            'post_type' => 'maktub',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        foreach ( $posts as $post ) {
            $id = $post->ID;
            $price = get_post_meta( $id, 'preco', true );
            if(empty($price)) $price = get_post_meta($id, '_price', true);
            $status = $this->is_active($id) ? '1' : '0';
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

        $categories = get_terms(['taxonomy' => 'maktub-categorias', 'hide_empty' => false]);
        return [
            'products' => $products,
            'categories' => is_wp_error($categories) ? [] : $categories
        ];
    }

    public function get_product( $request ) {
        $id = $request['id'];
        $img_val = get_post_meta( $id, 'img', true );
        $final_url = '';
        if ( !empty($img_val) ) {
            $final_url = is_numeric($img_val) ? wp_get_attachment_url($img_val) : $img_val;
        }

        return [
            'id' => $id,
            'title' => get_the_title($id),
            'preco' => get_post_meta( $id, 'preco', true ),
            'status' => $this->is_active($id) ? '1' : '0',
            'descricao' => get_post_meta( $id, 'descricao', true ),
            'img' => $final_url, // Return URL directly as the meta value
            'img_url' => $final_url,
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
            if ( $params['status'] === 'Disponível' ) {
                update_post_meta( $id, 'status', ['disponivel'] );
            } else {
                update_post_meta( $id, 'status', [] );
            }
        }

        if ( isset( $params['post_title'] ) ) {
            wp_update_post(['ID' => $id, 'post_title' => sanitize_text_field( $params['post_title'] )]);
        }

        if ( isset( $params['category'] ) ) {
            wp_set_object_terms( $id, $params['category'], 'maktub-categorias' );
        }

        if ( isset( $params['descricao'] ) ) {
            update_post_meta( $id, 'descricao', sanitize_textarea_field( $params['descricao'] ) );
        }

        if ( isset( $params['img'] ) ) {
            update_post_meta( $id, 'img', sanitize_text_field( $params['img'] ) );
        }

        clean_post_cache( $id );
        return [ 'success' => true ];
    }

    public function upload_image( $request ) {
        if ( ! function_exists( 'media_handle_upload' ) ) {
            require_once( ABSPATH . 'wp-admin/includes/image.php' );
            require_once( ABSPATH . 'wp-admin/includes/file.php' );
            require_once( ABSPATH . 'wp-admin/includes/media.php' );
        }

        if ( empty( $_FILES['file'] ) ) {
            return new WP_Error( 'no_file', 'Nenhum arquivo enviado.', [ 'status' => 400 ] );
        }

        $attachment_id = media_handle_upload( 'file', 0 );

        if ( is_wp_error( $attachment_id ) ) {
            return new WP_Error( 'upload_err', $attachment_id->get_error_message(), [ 'status' => 500 ] );
        }

        return [
            'success' => true,
            'id'      => $attachment_id,
            'url'     => wp_get_attachment_url( $attachment_id ),
        ];
    }

    public function create_product( $request ) {
        $params = $request->get_params();
        
        $id = wp_insert_post([
            'post_title'   => sanitize_text_field( $params['post_title'] ),
            'post_status'  => 'publish',
            'post_type'    => 'maktub'
        ]);

        if ( is_wp_error( $id ) ) return [ 'success' => false, 'error' => $id->get_error_message() ];

        if ( !empty( $params['category'] ) ) {
            wp_set_object_terms( $id, $params['category'], 'maktub-categorias' );
        }

        if ( isset( $params['preco'] ) ) {
            $price = sanitize_text_field( $params['preco'] );
            update_post_meta( $id, 'preco', $price );
            update_post_meta( $id, '_price', $price );
        }

        if ( isset( $params['status'] ) ) {
            if ( $params['status'] === 'Disponível' ) {
                update_post_meta( $id, 'status', ['disponivel'] );
            } else {
                update_post_meta( $id, 'status', [] );
            }
        }

        if ( isset( $params['descricao'] ) ) {
            update_post_meta( $id, 'descricao', sanitize_textarea_field( $params['descricao'] ) );
        }

        if ( !empty( $params['img'] ) ) {
            update_post_meta( $id, 'img', sanitize_text_field( $params['img'] ) );
        }

        return [ 'success' => true, 'id' => $id ];
    }

    public function get_inventory() {
        $ingredients = ['atum', 'bacon', 'calabresa', 'camarão', 'carne', 'costela', 'frango', 'pernil', 'queijo'];
        sort($ingredients);
        $status = get_option( 'maktub_inventory_status', [] );
        $result = [];
        foreach($ingredients as $ing) {
            $result[$ing] = isset($status[$ing]) ? $status[$ing] : '1';
        }
        return $result;
    }

    public function toggle_ingredient( $request ) {
        $params = $request->get_params();
        $ing = strtolower(sanitize_text_field($params['ingredient']));
        $new_status = $params['status'];
        
        $status_map = get_option( 'maktub_inventory_status', [] );
        $status_map[$ing] = $new_status;
        update_option( 'maktub_inventory_status', $status_map );

        $posts = get_posts(['post_type' => 'maktub', 'posts_per_page' => -1, 'post_status' => 'publish']);
        $count = 0;

        foreach($posts as $post) {
            $title = mb_strtolower($post->post_title, 'UTF-8');
            $desc = mb_strtolower(get_post_meta($post->ID, 'descricao', true), 'UTF-8');
            
            if (strpos($title, $ing) !== false || strpos($desc, $ing) !== false) {
                if ($new_status == '1') {
                    update_post_meta($post->ID, 'status', ['disponivel']);
                    update_post_meta($post->ID, '_stock_status', 'instock');
                } else {
                    update_post_meta($post->ID, 'status', []);
                    update_post_meta($post->ID, '_stock_status', 'outofstock');
                }
                clean_post_cache($post->ID);
                $count++;
            }
        }
        return [ 'success' => true, 'count' => $count ];
    }
}
