/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary:   "#3e7cbc",
                'primary-dark': "#2d5e91",
                'primary-light': "#5a94cc",
                accent:    "#48BB78",
                'accent-dark': "#38A169",
            },
        },
    },
    plugins: [],
}