/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary:        "#1565C0",
                'primary-dark': "#0D47A1",
                'primary-light':"#1976D2",
                accent:         "#48BB78",
                'accent-dark':  "#38A169",
            },
        },
    },
    plugins: [],
}