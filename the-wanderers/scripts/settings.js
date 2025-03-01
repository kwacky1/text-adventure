document.addEventListener('DOMContentLoaded', () => {
    const styleSelector = document.getElementById("styleselector");
    const fontSelector = document.getElementById("fontselector");
    const themeStylesheet = document.getElementById("themeStylesheet");

    // Load saved style and font from local storage
    const savedStyle = localStorage.getItem('selectedStyle');
    const savedFont = localStorage.getItem('selectedFont');

    if (savedStyle) {
        themeStylesheet.href = savedStyle;
        styleSelector.value = savedStyle;
    }

    if (savedFont) {
        document.body.style.fontFamily = savedFont;
        fontSelector.value = savedFont;
    }

    styleSelector.addEventListener("change", () => {
        const selectedStyle = styleSelector.value;
        themeStylesheet.href = selectedStyle;
        localStorage.setItem('selectedStyle', selectedStyle);
    });

    fontSelector.addEventListener("change", () => {
        const selectedFont = fontSelector.options[fontSelector.selectedIndex].style.fontFamily || 'Sanchez';
        document.body.style.fontFamily = selectedFont;
        localStorage.setItem('selectedFont', selectedFont);
    });
});
