/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'agri-green': '#2D5A27',
                'agri-light': '#F0F4EF',
            },
        },
    },
    plugins: [],
}
