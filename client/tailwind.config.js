/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            colors: {
                cyan: {
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                }
            }
        },
    },
    plugins: [],
}
