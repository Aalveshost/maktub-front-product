<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Maktub_API_Handler {

	private $namespace = 'maktub-front/v1';

	public function register_routes() {
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

	/**
	 * Check if user has permission to edit posts.
	 */
	public function update_permission_check( $request ) {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Fetch product data for the modal.
	 */
	public function get_product_data( $request ) {
		$id = $request['id'];
		$post = get_post( $id );

		if ( ! $post ) {
			return new WP_Error( 'no_product', 'Produto não encontrado', array( 'status' => 404 ) );
		}

		$price_field = get_option( 'maktub_price_field', '_price' );
		$price = get_post_meta( $id, $price_field, true );

		return rest_ensure_response( array(
			'id'     => $id,
			'title'  => $post->post_title,
			'price'  => $price,
			'status' => $post->post_status,
		) );
	}

	/**
	 * Update product metadata and status.
	 */
	public function update_product_data( $request ) {
		$id     = $request['id'];
		$price  = $request->get_param( 'price' );
		$status = $request->get_param( 'status' );

		if ( ! get_post( $id ) ) {
			return new WP_Error( 'no_product', 'Produto não encontrado', array( 'status' => 404 ) );
		}

		// Update Status
		if ( ! empty( $status ) ) {
			wp_update_post( array(
				'ID'          => $id,
				'post_status' => sanitize_text_field( $status ),
			) );
		}

		// Update Price (Jet Engine / WooCommerce)
		if ( isset( $price ) ) {
			$price_field = get_option( 'maktub_price_field', '_price' );
			$clean_price = sanitize_text_field( $price );
			update_post_meta( $id, $price_field, $clean_price );

			// If it's a WooCommerce product, sync other price fields if necessary
			if ( class_exists( 'WooCommerce' ) && $price_field === '_price' ) {
				update_post_meta( $id, '_regular_price', $clean_price );
				// Clear WC transients
				wc_delete_product_transients( $id );
			}
		}

		return rest_ensure_response( array(
			'success' => true,
			'message' => 'Produto atualizado com sucesso!',
		) );
	}
}
