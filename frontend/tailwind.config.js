/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary:   "#1565C0",
                'primary-dark': "#0D2F63",
                'primary-light': "#2979D4",
                accent:    "#48BB78",
                'accent-dark': "#38A169",
            },
        },
    },
    plugins: [],
}