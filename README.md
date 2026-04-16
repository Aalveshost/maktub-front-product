# Maktub Front Product Manager

Este plugin permite a edição rápida de preço e status de produtos diretamente no frontend do WordPress. Foi desenvolvido para funcionar perfeitamente com **Jet Engine (CPTs)** e **WooCommerce**.

## 🚀 Como instalar e usar

1.  **Deploy via WP Pusher:**
    *   Certifique-se de que o plugin está no seu repositório GitHub.
    *   No WordPress, use o WP Pusher para instalar o repositório `Aalveshost/maktub-front-product`.
    *   Ative o plugin.

2.  **Configurando o Gatilho (Botão de Editar):**
    No seu **Jet Engine > Listing Grid**, adicione um widget de "Dynamic Link" ou um botão HTML com as seguintes configurações:
    *   **Classe CSS:** `maktub-edit-trigger`
    *   **Atributo Personalizado:** `data-product-id="%current_id%"` (O Jet Engine substituirá `%current_id%` pelo ID real do produto).

3.  **Configurando Campos Customizados:**
    Por padrão, o plugin edita o campo `_price` (padrão WooCommerce). Se você usa um campo diferente no Jet Engine, pode alterá-lo diretamente no arquivo principal ou via banco de dados (opção `maktub_price_field`).

## ✨ Funcionalidades
*   **Modal Premium:** Design com Glassmorphism e desfoque de fundo.
*   **Segurança:** Utiliza REST API nativa do WP com validação de Nonces e permissões (`edit_posts`).
*   **Feedback em Tempo Real:** Loader de carregamento e mensagens de sucesso/erro.

## 🛠 Customização Técnica
Os estilos estão em `assets/css/style.css` e utilizam variáveis CSS. Você pode mudar as cores principais facilmente:
```css
:root {
    --maktub-primary: #6366f1; /* Cor Lilás */
}
```

---
Desenvolvido com 💜 para o projeto Maktub.
