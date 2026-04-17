(function($) {
    'use strict';

    const MaktubEditor = {
        allProducts: [],
        categories: [],
        currentMode: 'classic', 
        init: function() {
            this.cacheDOM();
            this.createToastElement();
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
            this.$modalBody = this.$dashModal.find('.maktub-modal-body');
            
            this.$priceInput = $('#maktub-price');
            this.$statusToggle = $('#maktub-status-toggle');
            this.$statusText = $('#maktub-status-text');
            this.$descInput = $('#maktub-desc');
            this.$productIdInput = $('#maktub-product-id');
            this.$modalTitle = $('#maktub-modal-title');
            this.$submitBtn = this.$form.find('.maktub-btn-primary');
        },

        createToastElement: function() {
            if ($('#maktub-toast').length === 0) {
                $('body').append('<div id="maktub-toast" class="maktub-toast">Atualizado com sucesso!</div>');
            }
            this.$toast = $('#maktub-toast');
        },

        showToast: function(message) {
            const self = this;
            this.$toast.text(message).addClass('is-active');
            setTimeout(function() { self.$toast.removeClass('is-active'); }, 1500);
        },

        bindEvents: function() {
            const self = this;
            $(document).on('click', '.maktub-trigger-classic', function(e) { e.preventDefault(); self.currentMode = 'classic'; self.openDashboard(); });
            $(document).on('click', '.maktub-trigger-grid', function(e) { e.preventDefault(); self.currentMode = 'grid'; self.openDashboard(); });
            
            this.$btnBack.on('click', function(e) { 
                if (self.$grid.is(':visible')) { self.$dashModal.removeClass('is-active').hide(); } 
                else { self.showGridOnly(); }
            });

            $(document).on('click', '.maktub-cat-card', function() {
                const slug = $(this).data('slug');
                if (self.currentMode === 'grid') { self.showListForCategory(slug); } 
                else { $('.maktub-cat-card').removeClass('is-active'); $(this).addClass('is-active'); self.renderList(slug); }
            });

            $(document).on('click', '.maktub-btn-edit', function(e) { e.preventDefault(); const productId = $(this).data('product-id'); if (productId) self.openEditModal(productId); });
            $(document).on('click', '.maktub-modal-close', function(e) { e.stopPropagation(); $(this).closest('.maktub-modal').removeClass('is-active').hide(); });

            this.$priceInput.on('input', function() {
                let v = $(this).val().replace(/\D/g, ''); 
                if (v.length > 5) v = v.substring(0, 5); 
                if (parseInt(v) > 99900) v = '99900';
                if (v === '') { $(this).val(''); return; }
                v = (parseInt(v) / 100).toFixed(2).replace('.', ',');
                $(this).val(v);
            });

            this.$statusToggle.on('change', function() {
                const isChecked = $(this).is(':checked');
                self.$statusText.text(isChecked ? 'Ativo' : 'Inativo');
                self.$statusText.removeClass('status-is-ativo status-is-inativo');
                self.$statusText.addClass(isChecked ? 'status-is-ativo' : 'status-is-inativo');
            });

            this.$form.on('submit', function(e) { e.preventDefault(); self.saveData(); });
        },

        formatPrice: function(price) {
            if (!price) return 'R$ 0,00';
            const val = parseFloat(price.toString().replace(',', '.'));
            return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        },

        openDashboard: function() {
            const self = this;
            this.$dashModal.addClass('is-active').show();
            this.$modalBody.show();
            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) {
                    self.allProducts = response.products;
                    self.categories = response.categories;
                    if (self.currentMode === 'grid') self.showGridOnly(); else self.showClassicView();
                }
            });
        },

        showGridOnly: function() {
            this.$btnBack.show();
            this.$mainTitle.text('Escolha uma Categoria');
            this.$grid.show();
            this.$list.hide();
            let gridHtml = '';
            const slugsToShow = ['pastel-salgado', 'pastel-doce', 'pastel-especial', 'cachorro-quente', 'porcoes', 'bebidas'];
            slugsToShow.forEach(slug => {
                const cat = (slug === 'bebidas') ? { name: 'Bebidas', slug: 'bebidas' } : this.categories.find(c => c.slug === slug);
                if (cat || slug === 'bebidas') {
                    let icon = '🥟';
                    if (slug.includes('doce')) icon = '🍩';
                    if (slug.includes('especial')) icon = '🌟';
                    if (slug.includes('hotdog') || slug.includes('cachorro')) icon = '🌭';
                    if (slug.includes('porcao') || slug.includes('porcoes')) icon = '🍟';
                    if (slug === 'bebidas') icon = '🥤';
                    gridHtml += `<div class="maktub-cat-card" data-slug="${cat.slug}"><div class="maktub-cat-img">${icon}</div><h5>${cat.name}</h5></div>`;
                }
            });
            this.$grid.html(gridHtml);
        },

        showClassicView: function() {
            this.$btnBack.hide();
            this.$mainTitle.text('Gerenciar Maktub');
            this.$grid.show(); 
            this.$list.show(); 
            let gridHtml = `<div class="maktub-cat-card" data-slug="all"><div class="maktub-cat-img">🏠</div><h5>Todos</h5></div>`;
            this.categories.forEach(cat => {
                let icon = '📦';
                const slug = cat.slug.toLowerCase();
                if (slug.includes('pastel')) icon = '🥟';
                if (slug.includes('bebida') || slug.includes('refri') || slug.includes('cerveja')) icon = '🥤';
                if (slug.includes('doce')) icon = '🍩';
                if (slug.includes('hotdog') || slug.includes('cachorro')) icon = '🌭';
                if (slug.includes('porcao') || slug.includes('porcoes')) icon = '🍟';
                if (slug.includes('adicional') || slug.includes('acrescimo')) icon = '✨';
                const isActive = (slug === 'pastel-salgado') ? 'is-active' : '';
                gridHtml += `<div class="maktub-cat-card ${isActive}" data-slug="${cat.slug}"><div class="maktub-cat-img">${icon}</div><h5>${cat.name}</h5></div>`;
            });
            this.$grid.html(gridHtml);
            this.renderList('pastel-salgado');
        },

        showListForCategory: function(slug) {
            this.$mainTitle.text(slug === 'bebidas' ? 'Bebidas' : (this.categories.find(c => c.slug === slug)?.name || 'Produtos'));
            this.$btnBack.show();
            this.$grid.hide();
            this.$list.show();
            this.renderList(slug);
        },

        renderList: function(categorySlug) {
            const self = this;
            let html = '';
            const filteredProducts = this.allProducts.filter(p => !p.title.toLowerCase().includes('mini'));

            // COMPOSITE GROUPS v1.3.14
            if (categorySlug === 'bebidas') {
                const beverageMap = [
                    { slug: 'cervejas', name: 'Cervejas' }, { slug: 'agua', name: 'Água' },
                    { slug: 'del-valle-290ml', name: 'Dell Valle 290ml' }, { slug: 'refri-lata-350ml', name: 'Refri Lata 350ml' },
                    { slug: 'refri-500ml', name: 'Refri 500ml' }, { slug: 'refri-600ml', name: 'Refri 600ml' },
                    { slug: 'refri-2l', name: 'Refri 2L' }, { slug: 'sucos-naturais', name: 'Sucos Naturais' }, { slug: 'sucos-polpa-preco', name: 'Sucos de Polpa' }
                ];
                beverageMap.forEach(bev => {
                    const catProducts = filteredProducts.filter(p => p.cat === bev.slug).sort((a,b) => a.title.localeCompare(b.title));
                    if (catProducts.length > 0) {
                        html += `<h3 class="maktub-list-section-title">${bev.name}</h3>`;
                        catProducts.forEach(item => { html += self.buildItemHtml(item); });
                    }
                });
            } else if (categorySlug === 'porcoes') {
                // NESTED PORCOES v1.3.14: Pasteis on top
                const pasteisItems = filteredProducts.filter(p => p.cat === 'porcoes-pasteis').sort((a,b) => a.title.localeCompare(b.title));
                const generalItems = filteredProducts.filter(p => p.cat === 'porcoes').sort((a,b) => a.title.localeCompare(b.title));
                
                pasteisItems.forEach(item => { html += self.buildItemHtml(item, false, 'b-bege'); });
                generalItems.forEach(item => { html += self.buildItemHtml(item, false, 'b-bege'); });
                
                if (html === '') html = '<p style="padding: 2rem; text-align: center;">Vazio.</p>';

            } else if (categorySlug === 'pastel-salgado' || categorySlug === 'pastel-doce' || categorySlug === 'cachorro-quente') {
                const mainItems = filteredProducts.filter(p => p.cat === categorySlug).sort((a,b) => a.title.localeCompare(b.title));
                const extraSlug = (categorySlug === 'pastel-salgado') ? 'pastel-salgado-adicional' : (categorySlug === 'pastel-doce' ? 'pastel-doce-adicional' : 'cachorro-quente-acrescimo');
                const extraItems = filteredProducts.filter(p => p.cat === extraSlug).sort((a,b) => a.title.localeCompare(b.title));

                mainItems.forEach(item => { html += self.buildItemHtml(item); });
                if (extraItems.length > 0) {
                    html += '<h3 class="maktub-list-section-title">Adicionais</h3>';
                    extraItems.forEach(item => { html += self.buildItemHtml(item, true); });
                }
            } else {
                let filtered = filteredProducts.filter(p => p.cat === categorySlug).sort((a, b) => a.title.localeCompare(b.title));
                if (filtered.length === 0 && categorySlug === 'all') filtered = [...filteredProducts];
                if (filtered.length === 0) { html = '<p style="padding: 2rem; text-align: center;">Vazio.</p>'; } 
                else { filtered.forEach(item => { html += self.buildItemHtml(item); }); }
            }
            this.$list.html(html);
        },

        buildItemHtml: function(item, forceAdicionalClass = false, forceBorder = null) {
            const statusClass = (item.status != '1') ? 'is-inactive' : '';
            const cat = item.cat;
            let borderClass = forceBorder || '';

            if (forceAdicionalClass || cat.includes('adicional') || cat.includes('acrescimo')) borderClass = 'b-gold';
            else if (cat === 'cachorro-quente') borderClass = 'b-hotdog';
            else if (cat === 'porcoes' || cat === 'porcoes-pasteis') borderClass = 'b-bege';
            else if (cat === 'cervejas') borderClass = 'b-beer';
            else if (cat === 'agua') borderClass = 'b-water';
            else if (cat === 'del-valle-290ml' || cat === 'refri-600ml') borderClass = 'b-peach';
            else if (cat === 'refri-lata-350ml') borderClass = 'b-refri-lata';
            else if (cat === 'refri-500ml') borderClass = 'b-refri-500';
            else if (cat === 'refri-2l') borderClass = 'b-refri-2l';
            else if (cat === 'sucos-naturais') borderClass = 'b-mango';
            else if (cat === 'sucos-polpa-preco') borderClass = 'b-forest';

            return `
                <div class="maktub-list-item ${statusClass} ${borderClass}">
                    <div class="maktub-item-info">
                        <h4>${item.title}</h4>
                        <div class="maktub-item-price">${this.formatPrice(item.price)}</div>
                    </div>
                    <div class="maktub-item-actions">
                        <button class="maktub-btn-edit" data-product-id="${item.id}">Editar</button>
                    </div>
                </div>
            `;
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
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) {
                    self.$loader.hide();
                    self.$form.show();
                    self.$modalTitle.text(response.title);
                    let p = response.preco || '0';
                    p = parseFloat(p).toFixed(2).replace('.', ',');
                    self.$priceInput.val(p);
                    const isActive = (response.status == '1');
                    self.$statusToggle.prop('checked', isActive).trigger('change');
                    self.$descInput.val(response.descricao);
                }
            });
        },

        saveData: function() {
            const self = this;
            const productId = this.$productIdInput.val();
            let cleanPrice = this.$priceInput.val().replace(',', '.');
            const statusVal = this.$statusToggle.is(':checked') ? 'Disponível' : '';
            const data = { preco: cleanPrice, status: statusVal, descricao: this.$descInput.val() };
            this.$submitBtn.prop('disabled', true).text('Salvando...');
            $.ajax({
                url: `${maktubData.restUrl}/product/${productId}`,
                method: 'POST',
                data: data,
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) {
                    self.$submitBtn.prop('disabled', false).text(maktubData.i18n.save);
                    self.showToast(maktubData.i18n.success);
                    self.$editModal.removeClass('is-active').hide();
                    const activeCat = $('.maktub-cat-card.is-active').data('slug') || 'all';
                    self.refreshData(activeCat);
                },
                error: function() { self.$submitBtn.prop('disabled', false).text(maktubData.i18n.save); self.showToast(maktubData.i18n.error); }
            });
        },

        refreshData: function(activeCat) {
            const self = this;
            $.ajax({
                url: `${maktubData.restUrl}/products`,
                method: 'GET',
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) { self.allProducts = response.products; self.renderList(activeCat); }
            });
        }
    };

    $(document).ready(function() { MaktubEditor.init(); });
})(jQuery);
