(function($) {
    'use strict';

    const MaktubEditor = {
        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },

        cacheDOM: function() {
            this.$dashModal = $('#maktub-dashboard-modal');
            this.$editModal = $('#maktub-editor-modal');
            this.$form = $('#maktub-edit-form');
            this.$loader = $('#maktub-loader');
            this.$list = $('#maktub-dashboard-list');
            
            this.$priceInput = $('#maktub-price');
            this.$statusSelect = $('#maktub-status');
            this.$descInput = $('#maktub-desc');
            this.$productIdInput = $('#maktub-product-id');
            this.$modalTitle = $('#maktub-modal-title');
            this.$submitBtn = this.$form.find('button[type="submit"]');
        },

        bindEvents: function() {
            const self = this;

            // Trigger Dashboard (Shortcode)
            $(document).on('click', '.maktub-dashboard-trigger', function(e) {
                e.preventDefault();
                self.openDashboard();
            });

            // Trigger Edit Modal (from Dashboard or List)
            $(document).on('click', '.maktub-edit-trigger, .maktub-btn-edit', function(e) {
                e.preventDefault();
                const productId = $(this).data('product-id');
                if (productId) {
                    self.openEditModal(productId);
                }
            });

            // Close Modals
            $(document).on('click', '.maktub-modal-close, .maktub-modal-overlay', function() {
                $('.maktub-modal').removeClass('is-active').hide();
            });

            // Form Submit
            this.$form.on('submit', function(e) {
                e.preventDefault();
                self.saveData();
            });
        },

        openDashboard: function() {
            const self = this;
            this.$dashModal.addClass('is-active').show();
            this.$list.html('<div class="maktub-loader"></div>');

            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    let html = '';
                    if (response.length === 0) {
                        html = '<p>Nenhum produto encontrado.</p>';
                    } else {
                        response.forEach(item => {
                            html += `
                                <div class="maktub-list-item">
                                    <div class="maktub-item-info">
                                        <h4>${item.title}</h4>
                                        <span>Preço: ${item.price || 'N/A'}</span>
                                    </div>
                                    <div class="maktub-item-actions">
                                        <button class="maktub-btn-edit" data-product-id="${item.id}">Editar</button>
                                    </div>
                                </div>
                            `;
                        });
                    }
                    self.$list.html(html);
                }
            });
        },

        openEditModal: function(productId) {
            const self = this;
            this.$editModal.addClass('is-active').show();
            this.$form.hide();
            this.$loader.show();
            this.$productIdInput.val(productId);

            $.ajax({
                url: `${maktubData.restUrl}/product/${productId}`,
                method: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    self.$loader.hide();
                    self.$form.show();
                    self.$modalTitle.text(response.title);
                    self.$priceInput.val(response.preco);
                    self.$statusSelect.val(response.status ? response.status : '0');
                    self.$descInput.val(response.descricao);
                }
            });
        },

        saveData: function() {
            const self = this;
            const productId = this.$productIdInput.val();
            const data = {
                preco: this.$priceInput.val(),
                status: this.$statusSelect.val(),
                descricao: this.$descInput.val()
            };

            this.$submitBtn.prop('disabled', true).text('Salvando...');

            $.ajax({
                url: `${maktubData.restUrl}/product/${productId}`,
                method: 'POST',
                data: data,
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    self.$submitBtn.prop('disabled', false).text(maktubData.i18n.save);
                    alert(maktubData.i18n.success);
                    self.$editModal.removeClass('is-active').hide();
                    if (self.$dashModal.is(':visible')) {
                        self.openDashboard(); // Refresh list
                    }
                },
                error: function() {
                    self.$submitBtn.prop('disabled', false).text(maktubData.i18n.save);
                    alert(maktubData.i18n.error);
                }
            });
        }
    };

    $(document).ready(function() {
        MaktubEditor.init();
    });

})(jQuery);
