(function($) {
    'use strict';

    const MaktubEditor = {
        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },

        cacheDOM: function() {
            this.$modal = $('#maktub-editor-modal');
            this.$form = $('#maktub-edit-form');
            this.$loader = $('#maktub-loader');
            this.$priceInput = $('#maktub-price');
            this.$statusSelect = $('#maktub-status');
            this.$productIdInput = $('#maktub-product-id');
            this.$modalTitle = $('#maktub-modal-title');
            this.$submitBtn = this.$form.find('button[type="submit"]');
        },

        bindEvents: function() {
            const self = this;

            // Trigger Modal Open
            $(document).on('click', '.maktub-edit-trigger', function(e) {
                e.preventDefault();
                const productId = $(this).data('product-id') || $(this).closest('[data-post-id]').data('post-id');
                if (productId) {
                    self.openModal(productId);
                }
            });

            // Close Modal
            $('.maktub-modal-close, .maktub-modal-overlay').on('click', function() {
                self.closeModal();
            });

            // Handle ESC key
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') self.closeModal();
            });

            // Form Submit
            this.$form.on('submit', function(e) {
                e.preventDefault();
                self.saveData();
            });
        },

        openModal: function(productId) {
            const self = this;
            this.$modal.addClass('is-active').show();
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
                    self.$priceInput.val(response.price);
                    self.$statusSelect.val(response.status);
                },
                error: function() {
                    alert(maktubData.i18n.error);
                    self.closeModal();
                }
            });
        },

        closeModal: function() {
            this.$modal.removeClass('is-active').hide();
            this.$form.trigger('reset');
        },

        saveData: function() {
            const self = this;
            const productId = this.$productIdInput.val();
            const data = {
                price: this.$priceInput.val(),
                status: this.$statusSelect.val()
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
                    self.closeModal();
                    // Optional: reload page to see changes
                    // location.reload();
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
