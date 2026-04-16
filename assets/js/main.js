(function($) {
    'use strict';

    const MaktubEditor = {
        allProducts: [],
        categories: [],
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
            this.$grid = $('#maktub-category-grid');
            this.$searchInput = $('#maktub-search');
            
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

            // Handle Search
            this.$searchInput.on('input', function() {
                const term = $(this).val().toLowerCase();
                const activeCat = $('.maktub-cat-card.is-active').data('slug');
                self.renderList(activeCat, term);
            });

            // Handle Grid Card Clicks
            $(document).on('click', '.maktub-cat-card', function() {
                $('.maktub-cat-card').removeClass('is-active');
                $(this).addClass('is-active');
                self.renderList($(this).data('slug'), self.$searchInput.val());
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

        formatPrice: function(price) {
            if (!price) return 'R$ 0,00';
            const val = parseFloat(price.toString().replace(',', '.'));
            return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        },

        openDashboard: function() {
            const self = this;
            this.$dashModal.addClass('is-active').show();
            this.$list.html('<div class="maktub-loader"></div>');
            this.$grid.empty();
            this.$searchInput.val('');

            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    self.allProducts = response.products;
                    self.categories = response.categories;
                    
                    // Render Grid Cards
                    let gridHtml = `
                        <div class="maktub-cat-card is-active" data-slug="all">
                            <div class="maktub-cat-img">🏠</div>
                            <h5>Todos</h5>
                        </div>
                    `;
                    
                    self.categories.forEach(cat => {
                        let icon = '📦'; // Fallback icon
                        if (cat.slug.includes('pastel')) icon = '🥟';
                        if (cat.slug.includes('bebida') || cat.slug.includes('cerveja')) icon = '🥤';
                        if (cat.slug.includes('doce')) icon = '🍩';
                        if (cat.slug.includes('cachorro')) icon = '🌭';

                        gridHtml += `
                            <div class="maktub-cat-card" data-slug="${cat.slug}">
                                <div class="maktub-cat-img">${icon}</div>
                                <h5>${cat.name}</h5>
                            </div>
                        `;
                    });
                    self.$grid.html(gridHtml);

                    // Render First List
                    self.renderList('all');
                }
            });
        },

        renderList: function(categorySlug, searchTerm = '') {
            const self = this;
            let html = '';
            
            let filtered = this.allProducts;

            // Filter by Category
            if (categorySlug !== 'all') {
                filtered = filtered.filter(p => p.cat === categorySlug);
            }

            // Filter by Search
            if (searchTerm) {
                filtered = filtered.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
            }

            if (filtered.length === 0) {
                html = '<p style="padding: 2rem; text-align: center;">Nenhum produto encontrado.</p>';
            } else {
                filtered.forEach(item => {
                    const catName = self.categories.find(c => c.slug === item.cat)?.name || 'Outros';
                    html += `
                        <div class="maktub-list-item">
                            <div class="maktub-item-info">
                                <div class="maktub-category-label">${catName}</div>
                                <h4>${item.title}</h4>
                                <div class="maktub-item-price">${self.formatPrice(item.price)}</div>
                            </div>
                            <div class="maktub-item-actions">
                                <button class="maktub-btn-edit" data-product-id="${item.id}">Editar</button>
                            </div>
                        </div>
                    `;
                });
            }
            this.$list.html(html);
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
                        const activeCat = $('.maktub-cat-card.is-active').data('slug');
                        const currentSearch = self.$searchInput.val();
                        
                        // Refresh products data and re-render list
                        self.refreshAndRender(activeCat, currentSearch);
                    }
                },
                error: function() {
                    self.$submitBtn.prop('disabled', false).text(maktubData.i18n.save);
                    alert(maktubData.i18n.error);
                }
            });
        },

        refreshAndRender: function(activeCat, currentSearch) {
            const self = this;
            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    self.allProducts = response.products;
                    self.renderList(activeCat, currentSearch);
                }
            });
        }
    };

    $(document).ready(function() {
        MaktubEditor.init();
    });

})(jQuery);
