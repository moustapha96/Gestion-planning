/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary:   "#1A365D",
                'primary-dark': "#122544",
                'primary-light': "#2B6CB0",
                accent:    "#48BB78",
                'accent-dark': "#38A169",
            },
        },
    },
    plugins: [],
}