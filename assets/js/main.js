(function($) {
    'use strict';

    const MaktubEditor = {
        allProducts: [],
        categories: [],
        currentMode: 'classic', // 'classic' or 'grid'
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
            this.$btnBack = $('#maktub-btn-back');
            this.$mainTitle = $('#maktub-main-title');
            this.$modalBody = $('.maktub-modal-body');
            
            this.$priceInput = $('#maktub-price');
            this.$statusSelect = $('#maktub-status');
            this.$descInput = $('#maktub-desc');
            this.$productIdInput = $('#maktub-product-id');
            this.$modalTitle = $('#maktub-modal-title');
            this.$submitBtn = this.$form.find('button[type="submit"]');
        },

        bindEvents: function() {
            const self = this;

            // Trigger Classic Dashboard
            $(document).on('click', '.maktub-trigger-classic', function(e) {
                e.preventDefault();
                self.currentMode = 'classic';
                self.openDashboard();
            });

            // Trigger Grid Dashboard
            $(document).on('click', '.maktub-trigger-grid', function(e) {
                e.preventDefault();
                self.currentMode = 'grid';
                self.openDashboard();
            });

            // Handle Back Button
            this.$btnBack.on('click', function() {
                self.showGridOnly();
            });

            // Handle Grid Card Clicks
            $(document).on('click', '.maktub-cat-card', function() {
                const slug = $(this).data('slug');
                
                if (self.currentMode === 'grid') {
                    // Navigate to Category
                    self.showListForCategory(slug);
                } else {
                    // Just filter
                    $('.maktub-cat-card').removeClass('is-active');
                    $(this).addClass('is-active');
                    self.renderList(slug);
                }
            });

            // Trigger Edit Modal
            $(document).on('click', '.maktub-edit-trigger, .maktub-btn-edit', function(e) {
                e.preventDefault();
                const productId = $(this).data('product-id');
                if (productId) {
                    self.openEditModal(productId);
                }
            });

            // Close CURRENT active Modal (Only the one being clicked)
            $(document).on('click', '.maktub-modal-close', function(e) {
                e.stopPropagation();
                $(this).closest('.maktub-modal').removeClass('is-active').hide();
            });

            // Close on overlay click (Only the top one)
            $(document).on('click', '.maktub-modal-overlay', function(e) {
                $(this).closest('.maktub-modal').removeClass('is-active').hide();
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
            this.$list.empty();
            this.$grid.empty();
            
            // Reset UI
            this.$btnBack.hide();
            this.$mainTitle.text('Gerenciar Maktub');
            this.$modalBody.show();

            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    self.allProducts = response.products;
                    self.categories = response.categories;
                    
                    if (self.currentMode === 'grid') {
                        self.showGridOnly();
                    } else {
                        self.showClassicView();
                    }
                }
            });
        },

        showGridOnly: function() {
            this.$btnBack.hide();
            this.$mainTitle.text('Escolha uma Categoria');
            this.$modalBody.hide();
            this.$grid.show();

            let gridHtml = '';
            const slugsToShow = ['pastel-salgado', 'pastel-doce', 'pastel-especial'];
            
            slugsToShow.forEach(slug => {
                const cat = this.categories.find(c => c.slug === slug);
                if (cat) {
                    let icon = '🥟';
                    if (slug.includes('doce')) icon = '🍩';
                    if (slug.includes('especial')) icon = '🌟';

                    gridHtml += `
                        <div class="maktub-cat-card" data-slug="${cat.slug}">
                            <div class="maktub-cat-img">${icon}</div>
                            <h5>${cat.name}</h5>
                        </div>
                    `;
                }
            });
            this.$grid.html(gridHtml);
        },

        showClassicView: function() {
            this.$btnBack.hide();
            this.$mainTitle.text('Gerenciar Maktub');
            this.$modalBody.show();
            this.$grid.show();

            let gridHtml = `
                <div class="maktub-cat-card" data-slug="all">
                    <div class="maktub-cat-img">🏠</div>
                    <h5>Todos</h5>
                </div>
            `;
            
            this.categories.forEach(cat => {
                let icon = '📦';
                const slug = cat.slug.toLowerCase();
                if (slug.includes('pastel')) icon = '🥟';
                if (slug.includes('bebida') || slug.includes('refri') || slug.includes('cerveja')) icon = '🥤';
                if (slug.includes('doce')) icon = '🍩';
                if (slug.includes('cachorro')) icon = '🌭';
                if (slug.includes('porcao') || slug.includes('porcoes')) icon = '🍟';

                const isActive = (slug === 'pastel-salgado') ? 'is-active' : '';

                gridHtml += `
                    <div class="maktub-cat-card ${isActive}" data-slug="${cat.slug}">
                        <div class="maktub-cat-img">${icon}</div>
                        <h5>${cat.name}</h5>
                    </div>
                `;
            });
            this.$grid.html(gridHtml);
            
            this.renderList('pastel-salgado');
        },

        showListForCategory: function(slug) {
            const cat = this.categories.find(c => c.slug === slug);
            this.$mainTitle.text(cat ? cat.name : 'Produtos');
            this.$btnBack.show();
            this.$grid.hide();
            this.$modalBody.show();
            
            this.renderList(slug);
        },

        renderList: function(categorySlug) {
            const self = this;
            let html = '';
            
            let filtered = [...this.allProducts];
            if (categorySlug !== 'all') {
                filtered = filtered.filter(p => p.cat === categorySlug);
            }

            filtered.sort((a, b) => a.title.localeCompare(b.title));

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
                    
                    const activeCat = $('.maktub-cat-card.is-active').data('slug') || 'all';
                    self.refreshData(activeCat);
                },
                error: function() {
                    self.$submitBtn.prop('disabled', false).text(maktubData.i18n.save);
                    alert(maktubData.i18n.error);
                }
            });
        },

        refreshData: function(activeCat) {
            const self = this;
            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) {
                    xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce);
                },
                success: function(response) {
                    self.allProducts = response.products;
                    self.renderList(activeCat);
                }
            });
        }
    };

    $(document).ready(function() {
        MaktubEditor.init();
    });

})(jQuery);
