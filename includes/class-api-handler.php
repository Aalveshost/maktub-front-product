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
            'permission_callback' => [ $this, 'check_permission' ],
        ]);

        // INVENTORY BULK ROUTES v1.3.46
        register_rest_route( 'maktub/v2', '/inventory', [
            'methods' => 'GET',
            'callback' => [ $this, 'get_inventory' ],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route( 'maktub/v2', '/inventory/toggle', [
            'methods' => 'POST',
            'callback' => [ $this, 'toggle_ingredient' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ]);
    }

    public function check_permission() {
        return current_user_can( 'manage_options' ) || current_user_can( 'administrator' ) || current_user_can( 'shop_manager' );
    }

    private function is_active( $id ) {
        // Strict check based on Jet Engine meta value "disponivel"
        $meta = get_post_meta( $id, 'status', true );
        
        if ( empty($meta) ) return false;

        // If it's an array (standard Jet Checkbox)
        if ( is_array($meta) ) {
            foreach($meta as $val) {
                $v = strtolower(trim((string)$val));
                if ($v === 'disponivel' || $v === '1' || $v === 'true') return true;
            }
            return false;
        }

        // If it's a serialized string
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

        // Simple string comparison
        $v = strtolower(trim((string)$meta));
        return ( $v === 'disponivel' || $v === '1' || $v === 'true' || $v === 'on' );
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
            
            // LOGIC v1.3.44: Checking for lowercase "disponivel"
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
        $status = $this->is_active($id) ? '1' : '0';

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
            // FIX v1.3.33: IMPORTANT! Using lowercase "disponivel" to match Jet Engine settings
            if ( $params['status'] === 'Disponível' ) {
                update_post_meta( $id, 'status', ['disponivel'] );
            } else {
                update_post_meta( $id, 'status', [] );
            }
        }

        if ( isset( $params['descricao'] ) ) {
            update_post_meta( $id, 'descricao', sanitize_textarea_field( $params['descricao'] ) );
        }

        clean_post_cache( $id );
        
        return [ 'success' => true ];
    }

    // INVENTORY LOGIC v1.3.46
    public function get_inventory() {
        $ingredients = ['atum', 'bacon', 'queijo', 'carne', 'calabresa', 'frango', 'pernil', 'costela', 'camarão'];
        $status = get_option( 'maktub_inventory_status', [] );
        
        $result = [];
        foreach($ingredients as $ing) {
            $result[$ing] = isset($status[$ing]) ? $status[$ing] : '1'; // Default active
        }
        return $result;
    }

    public function toggle_ingredient( $request ) {
        $params = $request->get_params();
        $ing = strtolower(sanitize_text_field($params['ingredient']));
        $new_status = $params['status']; // '1' or '0'
        
        // Update Options
        $status_map = get_option( 'maktub_inventory_status', [] );
        $status_map[$ing] = $new_status;
        update_option( 'maktub_inventory_status', $status_map );

        // Update Products
        $args = [
            'post_type' => 'maktub',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ];
        $posts = get_posts($args);
        $count = 0;

        foreach($posts as $post) {
            $title = strtolower($post->post_title);
            if (strpos($title, $ing) !== false) {
                // Bulk Toggle Status
                if ($new_status == '1') {
                    update_post_meta($post->ID, 'status', ['disponivel']);
                } else {
                    update_post_meta($post->ID, 'status', []);
                }
                clean_post_cache($post->ID);
                $count++;
            }
        }

        return [ 'success' => true, 'count' => $count ];
    }
}
