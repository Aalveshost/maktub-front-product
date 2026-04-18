(function($) {
    'use strict';

    const MaktubEditor = {
        allProducts: [],
        categories: [],
        inventory: {}, 
        currentMode: 'classic', 
        isBatchMode: false,
        currentBatchCategory: null,
        currentCategory: 'all',
        statusChangedInModal: false,
        pendingIngredient: null,

        init: function() {
            this.cacheDOM();
            this.bindEvents();
        },

        cacheDOM: function() {
            this.$dashModal = $('#maktub-dashboard-modal');
            this.$editModal = $('#maktub-editor-modal');
            this.$invModal = $('#maktub-inventory-modal');
            this.$form = $('#maktub-edit-form');
            this.$loader = $('#maktub-loader');
            this.$list = $('#maktub-dashboard-list');
            this.$grid = $('#maktub-category-grid');
            this.$btnBack = $('#maktub-btn-back');
            this.$btnNew = $('#maktub-btn-new');
            this.$mainTitle = $('#maktub-main-title');
            this.$modalBody = this.$dashModal.find('.maktub-modal-body');
            
            this.$titleInput = $('#maktub-title');
            this.$catSelect = $('#maktub-category-select');
            this.$priceInput = $('#maktub-price');
            this.$statusToggle = $('#maktub-status-toggle');
            this.$statusText = $('#maktub-status-text');
            this.$descInput = $('#maktub-desc');
            
            // Image Elements - Resilient Cache
            this.$imgIdInput = $('#maktub-img-id');
            this.$imgPreview = $('#maktub-img-preview');
            this.$imgEmpty = $('#maktub-img-empty');
            this.$dropzone = $('#maktub-dropzone');
            this.$fileInput = $('#maktub-file-input');
            this.$btnRemoveImg = $('#maktub-btn-remove-img');
            this.$uploadStatus = $('#maktub-upload-status');
            
            this.$productIdInput = $('#maktub-product-id');
            this.$modalTitle = $('#maktub-modal-title');
            this.$submitBtn = this.$form.find('.maktub-btn-primary');
        },

        bindEvents: function() {
            const self = this;
            $(document).on('click', '.maktub-trigger-grid', function(e) { e.preventDefault(); self.currentMode = 'grid'; self.openDashboard(); });
            
            this.$btnBack.on('click', function(e) { 
                if (self.$grid.is(':visible')) { self.$dashModal.removeClass('is-active').hide(); } 
                else { self.showGridOnly(); }
            });

            this.$btnNew.on('click', function() { self.openCreateModal(); });
            
            // Drag & Drop / Click Upload
            if (this.$dropzone.length) {
                this.$dropzone.on('click', function(e) { if (!$(e.target).is('button')) self.$fileInput.click(); });
                this.$dropzone.on('dragover', function(e) { e.preventDefault(); $(this).css('border-color', 'var(--maktub-orange)').css('background', '#fffcf0'); });
                this.$dropzone.on('dragleave', function(e) { e.preventDefault(); $(this).css('border-color', '#e2e8f0').css('background', '#fdfdfd'); });
                this.$dropzone.on('drop', function(e) {
                    e.preventDefault();
                    $(this).css('border-color', '#e2e8f0').css('background', '#fdfdfd');
                    const files = e.originalEvent.dataTransfer.files;
                    if (files.length) self.handleUpload(files[0]);
                });
            }

            this.$fileInput.on('change', function() { if (this.files.length) self.handleUpload(this.files[0]); });
            this.$btnRemoveImg.on('click', function(e) { e.stopPropagation(); self.clearImage(); });

            $(document).on('click', '.maktub-cat-card', function() {
                const slug = $(this).data('slug');
                if (self.currentMode === 'grid') { self.showListForCategory(slug); } 
            });

            $(document).on('click', '.maktub-inventory-tag', function() {
                const ing = $(this).data('ingredient');
                self.pendingIngredient = ing;
                $('#maktub-inv-title').text('Gestão de ' + ing.toUpperCase());
                $('#maktub-inv-desc').text(`Alterar status de todos os itens com "${ing.toUpperCase()}"?`);
                self.$invModal.addClass('is-active').show();
            });

            $('#maktub-inv-btn-on').on('click', function() { self.toggleInventory(self.pendingIngredient, '1'); });
            $('#maktub-inv-btn-off').on('click', function() { self.toggleInventory(self.pendingIngredient, '0'); });

            $(document).on('click', '.maktub-btn-edit', function(e) { e.preventDefault(); const productId = $(this).data('product-id'); self.openEditModal(productId); });
            $(document).on('click', '.maktub-modal-close', function(e) { e.stopPropagation(); $(this).closest('.maktub-modal').removeClass('is-active').hide(); });

            this.$priceInput.on('input', function() { let v = $(this).val().replace(/\D/g, ''); if (v.length > 5) v = v.substring(0, 5); if (parseInt(v) > 99900) v = '99900'; if (v === '') { $(this).val(''); return; } v = (parseInt(v) / 100).toFixed(2).replace('.', ','); $(this).val(v); });
            this.$statusToggle.on('change', function() { const isChecked = $(this).is(':checked'); self.$statusText.text(isChecked ? 'Ativo' : 'Inativo'); self.$statusText.removeClass('status-is-ativo status-is-inativo').addClass(isChecked ? 'status-is-ativo' : 'status-is-inativo'); self.statusChangedInModal = true; });
            this.$form.on('submit', function(e) { e.preventDefault(); self.saveData(); });
        },

        handleUpload: function(file) {
            if (!file) return;
            const self = this;
            const formData = new FormData();
            formData.append('file', file);

            this.$uploadStatus.show().text('Enviando imagem...');
            this.$dropzone.css('opacity', '0.6');

            $.ajax({
                url: `${maktubData.restUrl}/upload`,
                method: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) {
                    self.$uploadStatus.hide();
                    self.$dropzone.css('opacity', '1');
                    if (response.success) {
                        self.$imgIdInput.val(response.id);
                        self.$imgPreview.attr('src', response.url).show();
                        self.$imgEmpty.hide();
                        self.$btnRemoveImg.show();
                    }
                },
                error: function() {
                    self.$uploadStatus.text('Falha no upload!').css('color', 'red');
                    self.$dropzone.css('opacity', '1');
                }
            });
        },

        clearImage: function() {
            if (this.$imgIdInput.length) this.$imgIdInput.val('');
            if (this.$imgPreview.length) this.$imgPreview.attr('src', '').hide();
            if (this.$imgEmpty.length) this.$imgEmpty.show();
            if (this.$btnRemoveImg.length) this.$btnRemoveImg.hide();
            if (this.$fileInput.length) this.$fileInput.val('');
        },

        toggleInventory: function(ing, newStatus) {
            const self = this;
            this.$invModal.removeClass('is-active').hide();
            $.ajax({
                url: `${maktubData.restUrl}/inventory/toggle`,
                method: 'POST',
                data: { ingredient: ing, status: newStatus },
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) { if (response.success) { self.openDashboard(); } },
                error: function() { console.error('Error updating inventory.'); }
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
            this.$modalBody.show();
            $.when(
                $.ajax({ url: `${maktubData.restUrl}/products`, method: 'GET', beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); } }),
                $.ajax({ url: `${maktubData.restUrl}/inventory`, method: 'GET', beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); } })
            ).then(function(res1, res2) {
                self.allProducts = res1[0].products || [];
                self.categories = res1[0].categories || [];
                self.inventory = res2[0];
                self.renderInventoryBar();
                self.showGridOnly();
                self.populateCatSelect();
            });
        },

        populateCatSelect: function() {
            let html = '<option value="">Selecione uma Categoria...</option>';
            this.categories.forEach(cat => {
                html += `<option value="${cat.slug}">${cat.name}</option>`;
            });
            this.$catSelect.html(html);
        },

        renderInventoryBar: function() {
            if ($('#maktub-inventory-bar').length === 0) {
                this.$modalBody.prepend('<div id="maktub-inventory-bar" class="maktub-inventory-scroll"></div>');
            }
            const $bar = $('#maktub-inventory-bar');
            let html = '';
            for (const [ing, status] of Object.entries(this.inventory)) {
                const statusClass = status === '1' ? 'is-available' : 'is-unavailable';
                html += `<div class="maktub-inventory-tag ${statusClass}" data-ingredient="${ing}">${ing}</div>`;
            }
            $bar.html(html);
        },

        getStatsForCategory: function(slug) {
            const filtered = this.allProducts.filter(p => !p.title.toLowerCase().includes('mini'));
            let targetProducts = [];
            if (slug === 'bebidas') {
                const bevSlugs = ['cervejas', 'agua', 'del-valle-290ml', 'refri-lata-350ml', 'refri-500ml', 'refri-600ml', 'refri-2l', 'sucos-naturais', 'sucos-polpa-preco'];
                targetProducts = filtered.filter(p => bevSlugs.includes(p.cat));
            } else if (slug === 'porcoes') {
                targetProducts = filtered.filter(p => p.cat === 'porcoes' || p.cat === 'porcoes-pasteis');
            } else { targetProducts = filtered.filter(p => p.cat === slug); }
            const total = targetProducts.length;
            const active = targetProducts.filter(p => p.status == '1').length;
            return total > 0 ? `<span class="maktub-cat-badge">${active}/${total}</span>` : '';
        },

        showGridOnly: function() {
            this.$btnBack.show(); this.$mainTitle.text('Escolha uma Categoria'); this.$grid.show(); this.$list.hide(); this.currentCategory = 'grid';
            let gridHtml = '';
            const slugsToShow = ['pastel-salgado', 'pastel-doce', 'pastel-especial', 'cachorro-quente', 'porcoes', 'bebidas', 'sorvetes'];
            slugsToShow.forEach(slug => {
                const cat = (slug === 'bebidas') ? { name: 'Bebidas', slug: 'bebidas' } : this.categories.find(c => c.slug === slug);
                if (cat) {
                    let icon = '🥟';
                    if (cat.slug.includes('doce')) icon = '🍩';
                    else if (cat.slug.includes('especial')) icon = '🌟';
                    else if (cat.slug.includes('hotdog') || cat.slug.includes('cachorro')) icon = '🌭';
                    else if (cat.slug.includes('porcao') || cat.slug.includes('porcoes')) icon = '🍟';
                    else if (cat.slug === 'bebidas') icon = '🥤';
                    else if (cat.slug === 'sorvetes') icon = '🍦';
                    const stats = this.getStatsForCategory(cat.slug);
                    gridHtml += `<div class="maktub-cat-card" data-slug="${cat.slug}">${stats}<div class="maktub-cat-img">${icon}</div><h5>${cat.name}</h5></div>`;
                }
            });
            this.$grid.html(gridHtml);
        },

        showListForCategory: function(slug) {
            this.$mainTitle.text(slug === 'bebidas' ? 'Bebidas' : (slug === 'sorvetes' ? 'Sorvetes' : (this.categories.find(c => c.slug === slug)?.name || 'Produtos')));
            this.$btnBack.show(); this.$grid.hide(); this.$list.show();
            this.renderList(slug);
        },

        renderList: function(categorySlug) {
            const self = this; this.currentCategory = categorySlug; let html = '';
            const filteredProducts = this.allProducts.filter(p => !p.title.toLowerCase().includes('mini'));
            if (categorySlug === 'bebidas') {
                const beverageMap = [ { slug: 'cervejas', name: 'Cervejas' }, { slug: 'agua', name: 'Água' }, { slug: 'del-valle-290ml', name: 'Dell Valle 290ml' }, { slug: 'refri-lata-350ml', name: 'Refri Lata 350ml' }, { slug: 'refri-500ml', name: 'Refri 500ml' }, { slug: 'refri-600ml', name: 'Refri 600ml' }, { slug: 'refri-2l', name: 'Refri 2L' }, { slug: 'sucos-naturais', name: 'Sucos Naturais' }, { slug: 'sucos-polpa-preco', name: 'Sucos de Polpa' } ];
                beverageMap.forEach(bev => {
                    const catProducts = filteredProducts.filter(p => p.cat === bev.slug).sort((a,b) => a.title.localeCompare(b.title));
                    if (catProducts.length > 0) { html += `<h3 class="maktub-list-section-title">${bev.name}</h3>`; catProducts.forEach(item => { html += self.buildItemHtml(item); }); }
                });
            } else if (categorySlug === 'porcoes') {
                const generalItems = filteredProducts.filter(p => p.cat === 'porcoes' || p.cat === 'porcoes-pasteis').sort((a,b) => a.title.localeCompare(b.title));
                generalItems.forEach(item => { html += self.buildItemHtml(item, false, 'b-bege'); });
            } else if (categorySlug === 'pastel-salgado' || categorySlug === 'pastel-doce' || categorySlug === 'cachorro-quente') {
                const mainItems = filteredProducts.filter(p => p.cat === categorySlug).sort((a,b) => a.title.localeCompare(b.title));
                const extraSlug = (categorySlug === 'pastel-salgado') ? 'pastel-salgado-adicional' : (categorySlug === 'pastel-doce' ? 'pastel-doce-adicional' : 'cachorro-quente-acrescimo');
                const extraItems = filteredProducts.filter(p => p.cat === extraSlug).sort((a,b) => a.title.localeCompare(b.title));
                mainItems.forEach(item => { html += self.buildItemHtml(item); });
                if (extraItems.length > 0) { html += '<h3 class="maktub-list-section-title">Adicionais</h3>'; extraItems.forEach(item => { html += self.buildItemHtml(item, true); }); }
            } else {
                let border = (categorySlug === 'sorvetes') ? 'b-sorvete' : null;
                let filtered = filteredProducts.filter(p => p.cat === categorySlug).sort((a, b) => a.title.localeCompare(b.title));
                if (filtered.length === 0) { html = '<p style="padding: 2rem; text-align: center;">Vazio.</p>'; } else { filtered.forEach(item => { html += self.buildItemHtml(item, false, border); }); }
            }
            this.$list.html(html);
        },

        buildItemHtml: function(item, forceAdicionalClass = false, forceBorder = null) {
            const statusClass = (item.status != '1') ? 'is-inactive' : ''; 
            const cat = item.cat || ''; let borderClass = forceBorder || '';
            if (forceAdicionalClass || cat.includes('adicional') || cat.includes('acrescimo')) borderClass = 'b-gold';
            else if (cat === 'cachorro-quente' || cat === 'cachorro-quente-acrescimo') borderClass = 'b-hotdog';
            else if (cat === 'porcoes' || cat === 'porcoes-pasteis') borderClass = 'b-bege';
            else if (cat === 'sorvetes') borderClass = 'b-sorvete';
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
                    <div class="maktub-item-info"><h4>${item.title || 'Sem Título'}</h4><div class="maktub-item-price">${this.formatPrice(item.price)}</div></div>
                    <div class="maktub-item-actions"><button class="maktub-btn-edit" data-product-id="${item.id}">Editar</button></div>
                </div>
            `;
        },

        openCreateModal: function() {
            this.$productIdInput.val('0');
            this.$titleInput.val('');
            this.$catSelect.val(this.currentCategory !== 'grid' && this.currentCategory !== 'all' ? this.currentCategory : '');
            this.$priceInput.val('');
            this.$statusToggle.prop('checked', true);
            this.$statusText.text('Ativo').addClass('status-is-ativo').removeClass('status-is-inativo');
            this.$descInput.val('');
            this.clearImage();
            this.$modalTitle.text('Novo Item');
            this.$submitBtn.text('Cadastrar Item');
            this.$editModal.addClass('is-active').show(); this.$form.show(); this.$loader.hide();
        },

        openEditModal: function(productId) {
            const self = this; this.$editModal.addClass('is-active').show(); this.$form.hide(); this.$loader.show(); this.$productIdInput.val(productId);
            this.$submitBtn.text('Salvar Alterações');
            $.ajax({
                url: `${maktubData.restUrl}/product/${productId}`, method: 'GET', beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); },
                success: function(response) {
                    self.$loader.hide(); self.$form.show();
                    self.$modalTitle.text('Editar Item');
                    self.$titleInput.val(response.title || '');
                    let p = response.preco || '0'; p = parseFloat(p).toFixed(2).replace('.', ','); self.$priceInput.val(p);
                    let isActive = (response.status == '1');
                    self.$statusToggle.prop('checked', isActive); self.$statusText.text(isActive ? 'Ativo' : 'Inativo');
                    self.$statusText.removeClass('status-is-ativo status-is-inativo').addClass(isActive ? 'status-is-ativo' : 'status-is-inativo');
                    self.$descInput.val(response.descricao || '');
                    
                    if (response.img && response.img_url) {
                        if (self.$imgIdInput.length) self.$imgIdInput.val(response.img);
                        if (self.$imgPreview.length) self.$imgPreview.attr('src', response.img_url).show();
                        if (self.$imgEmpty.length) self.$imgEmpty.hide();
                        if (self.$btnRemoveImg.length) self.$btnRemoveImg.show();
                    } else { self.clearImage(); }
                    
                    const product = self.allProducts.find(x => x.id == productId);
                    if (product && self.$catSelect.length) self.$catSelect.val(product.cat);
                }
            });
        },

        saveData: function() {
            const self = this; 
            const productId = this.$productIdInput.val(); 
            let cleanPrice = this.$priceInput.val().replace(',', '.'); 
            const statusVal = this.$statusToggle.is(':checked') ? 'Disponível' : '';
            
            const data = { 
                post_title: this.$titleInput.val(),
                category: this.$catSelect.val(),
                preco: cleanPrice, 
                descricao: this.$descInput.val(), 
                status: statusVal,
                img: this.$imgIdInput.val()
            };

            const url = (productId === '0') ? `${maktubData.restUrl}/product` : `${maktubData.restUrl}/product/${productId}`;
            
            this.$submitBtn.prop('disabled', true).text('Processando...');
            $.ajax({ 
                url: url, 
                method: 'POST', 
                data: data, 
                beforeSend: function(xhr) { xhr.setRequestHeader('X-WP-Nonce', maktubData.nonce); }, 
                success: function() { 
                    self.$submitBtn.prop('disabled', false); 
                    self.$editModal.removeClass('is-active').hide(); 
                    self.openDashboard(); 
                }, 
                error: function() { 
                    self.$submitBtn.prop('disabled', false).text('Tentar Novamente'); 
                    console.error('Error saving item.'); 
                } 
            });
        }
    };

    $(document).ready(function() { MaktubEditor.init(); });
})(jQuery);
