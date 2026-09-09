// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
export async function highlightRecipes(root) {
    const recipes = root.querySelectorAll('.python-recipe');
    if (!recipes.length) { return; }
    try {
        const {default: hljs} = await import('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/es/highlight.min.js');
        for (const recipe of recipes) {
            if (!recipe.dataset.highlighted) { hljs.highlightElement(recipe); }
        }
    } catch (error) {
        // The original source remains readable when the CDN is unavailable.
        console.warn('Python syntax highlighting unavailable', error);
    }
}
