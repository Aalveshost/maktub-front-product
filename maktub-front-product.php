<?php
/**
 * Plugin Name: Maktub Front Product Manager
 * Plugin URI: https://github.com/Aalveshost/maktub-front-product
 * Description: Interface premium para edição de produtos (Preço e Status) no frontend. Integrado com Jet Engine e WooCommerce.
 * Version: 1.3.18
 * Author: Antigravity AI
 * Author URI: https://google.com
 * Text Domain: maktub-front
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Maktub_Front_Product {

	private static $instance = null;

	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->define_constants();
		$this->init_hooks();
	}

	private function define_constants() {
		define( 'MAKTUB_FRONT_VERSION', '1.3.18' );
		define( 'MAKTUB_FRONT_PATH', plugin_dir_path( __FILE__ ) );
		define( 'MAKTUB_FRONT_URL', plugin_dir_url( __FILE__ ) );
	}

	private function init_hooks() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'wp_footer', array( $this, 'render_modal_container' ) );
		add_shortcode( 'product-edit', array( $this, 'render_edit_shortcode' ) );
		
		// Load REST API
		require_once MAKTUB_FRONT_PATH . 'includes/class-api-handler.php';
		$api_handler = new Maktub_API_Handler();
		add_action( 'rest_api_init', array( $api_handler, 'register_routes' ) );
	}

	public function render_edit_shortcode() {
		return '
			<div class="maktub-triggers-wrapper">
				<button class="maktub-dashboard-trigger maktub-trigger-classic" title="Lista Rápida">
					<i class="dashicons dashicons-admin-generic"></i>
				</button>
				<button class="maktub-dashboard-trigger maktub-trigger-grid" title="Categorias">
					<i class="dashicons dashicons-grid-view"></i>
				</button>
			</div>
		';
	}

	public function enqueue_assets() {
		// Enqueue Dashicons for the shortcode
		wp_enqueue_style( 'dashicons' );

		// Enqueue styles
		wp_enqueue_style( 'maktub-front-style', MAKTUB_FRONT_URL . 'assets/css/style.css', array(), MAKTUB_FRONT_VERSION );

		// Enqueue scripts
		wp_enqueue_script( 'maktub-front-script', MAKTUB_FRONT_URL . 'assets/js/main.js', array( 'jquery' ), MAKTUB_FRONT_VERSION, true );

		// Localize script for AJAX/REST
		wp_localize_script( 'maktub-front-script', 'maktubData', array(
			'restUrl'  => esc_url_raw( rest_url( 'maktub-front/v1' ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'settings' => array(
				'cpt'            => 'maktub',
				'price_field'    => 'preco',
				'status_field'   => 'status',
				'desc_field'     => 'descricao',
			),
			'i18n' => array(
				'editing' => __( 'Editando Produto', 'maktub-front' ),
				'save'    => __( 'Salvar Alterações', 'maktub-front' ),
				'success' => __( 'Atualizado com sucesso!', 'maktub-front' ),
				'error'   => __( 'Erro ao salvar.', 'maktub-front' ),
			)
		) );
	}

	public function render_modal_container() {
		?>
		<!-- Dashboard Modal (List) -->
		<div id="maktub-dashboard-modal" class="maktub-modal" style="display:none;">
			<div class="maktub-modal-overlay"></div>
			<div class="maktub-modal-content maktub-modal-large">
				<div class="maktub-modal-header">
					<button id="maktub-btn-back" class="maktub-back-link" style="display:none;">&larr; Voltar</button>
					<h3 id="maktub-main-title">Gerenciar Maktub</h3>
					<button class="maktub-modal-close">&times;</button>
				</div>
				
				<div class="maktub-modal-body">
					<div id="maktub-category-grid" class="maktub-grid">
						<!-- Category cards here -->
					</div>
					<div id="maktub-dashboard-list" class="maktub-list">
						<!-- List will be populated via JS -->
					</div>
				</div>
			</div>
		</div>

		<!-- Editor Modal (Item) -->
		<div id="maktub-editor-modal" class="maktub-modal" style="display:none;">
			<div class="maktub-modal-overlay"></div>
			<div class="maktub-modal-content">
				<div class="maktub-modal-header">
					<h3 id="maktub-modal-title">Editar Item</h3>
					<button class="maktub-modal-close">&times;</button>
				</div>
				<div class="maktub-modal-body">
					<div id="maktub-loader" class="maktub-loader" style="display:none;"></div>
					<form id="maktub-edit-form">
						<input type="hidden" id="maktub-product-id" name="product_id">
						
						<div class="maktub-field-group">
							<label for="maktub-price">Preço</label>
							<input type="text" id="maktub-price" name="preco" placeholder="0.00">
						</div>

						<div class="maktub-field-group">
							<label>Status do Produto</label>
							<div class="maktub-toggle-wrapper">
								<input type="checkbox" id="maktub-status-toggle" class="maktub-toggle-checkbox">
								<label for="maktub-status-toggle" class="maktub-toggle-label"></label>
								<span id="maktub-status-text">Ativo</span>
							</div>
						</div>

						<div class="maktub-field-group">
							<label for="maktub-desc">Descrição</label>
							<textarea id="maktub-desc" name="descricao" rows="4"></textarea>
						</div>

						<div class="maktub-modal-footer">
							<button type="submit" class="maktub-btn maktub-btn-primary">Salvar Alterações</button>
						</div>
					</form>
				</div>
			</div>
		</div>
		<?php
	}
}

// Start the plugin
add_action( 'plugins_loaded', array( 'Maktub_Front_Product', 'get_instance' ) );
