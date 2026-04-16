<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Maktub_API_Handler {

	private $namespace = 'maktub-front/v1';

	public function register_routes() {
		// List all products
		register_rest_route( $this->namespace, '/products', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_products' ),
				'permission_callback' => array( $this, 'update_permission_check' ),
			),
		) );

		// Single product operations
		register_rest_route( $this->namespace, '/product/(?P<id>\d+)', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_product_data' ),
				'permission_callback' => array( $this, 'update_permission_check' ),
			),
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_product_data' ),
				'permission_callback' => array( $this, 'update_permission_check' ),
			),
		) );
	}

	public function update_permission_check( $request ) {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Get all products and categories.
	 */
	public function get_products() {
		$posts = get_posts( array(
			'post_type'      => 'maktub',
			'post_status'    => array( 'publish', 'draft', 'private', 'pending' ),
			'posts_per_page' => -1,
		) );

		$categories = get_terms( array(
			'taxonomy'   => 'maktub-categorias',
			'hide_empty' => false,
		) );

		$cat_data = array();
		foreach ( $categories as $cat ) {
			$cat_data[] = array(
				'id'   => $cat->term_id,
				'name' => $cat->name,
				'slug' => $cat->slug,
			);
		}

		$price_field = 'preco';
		$prod_data = array();

		foreach ( $posts as $post ) {
			$terms = wp_get_post_terms( $post->ID, 'maktub-categorias' );
			
			// Normalize status for initial list
			$status_raw = get_post_meta( $post->ID, 'status', true );
			$status_clean = ! empty( $status_raw ) ? '1' : '0';

			$prod_data[] = array(
				'id'     => $post->ID,
				'title'  => $post->post_title,
				'price'  => get_post_meta( $post->ID, $price_field, true ),
				'status' => $status_clean,
				'cat'    => ! empty( $terms ) ? $terms[0]->slug : 'uncategorized',
			);
		}

		return rest_ensure_response( array(
			'products'   => $prod_data,
			'categories' => $cat_data,
		) );
	}

	public function get_product_data( $request ) {
		$id = $request['id'];
		$post = get_post( $id );

		if ( ! $post ) {
			return new WP_Error( 'no_product', 'Não encontrado', array( 'status' => 404 ) );
		}

		// Normalize status for single product view
		$status_raw = get_post_meta( $id, 'status', true );
		$status_clean = ! empty( $status_raw ) ? '1' : '0';

		return rest_ensure_response( array(
			'id'        => $id,
			'title'     => $post->post_title,
			'preco'     => get_post_meta( $id, 'preco', true ),
			'status'    => $status_clean,
			'descricao' => get_post_meta( $id, 'descricao', true ),
		) );
	}

	public function update_product_data( $request ) {
		$id        = $request['id'];
		$preco     = $request->get_param( 'preco' );
		$status    = $request->get_param( 'status' );
		$descricao = $request->get_param( 'descricao' );

		if ( ! get_post( $id ) ) {
			return new WP_Error( 'no_product', 'Não encontrado', array( 'status' => 404 ) );
		}

		// Update Custom Fields
		if ( isset( $preco ) ) {
			update_post_meta( $id, 'preco', sanitize_text_field( $preco ) );
		}
		if ( isset( $status ) ) {
			update_post_meta( $id, 'status', sanitize_text_field( $status ) );
		}
		if ( isset( $descricao ) ) {
			update_post_meta( $id, 'descricao', sanitize_textarea_field( $descricao ) );
		}

		return rest_ensure_response( array(
			'success' => true,
			'message' => 'Atualizado!',
		) );
	}
}
