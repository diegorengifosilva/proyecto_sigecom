/** Atajos Tab / Shift+Tab para sangrar listas numeradas y con viñetas en Quill. */
export const quillListKeyboard = {
  bindings: {
    tab: {
      key: 9,
      handler(range, context) {
        if (context.format.list) {
          this.quill.format("indent", "+1");
          return false;
        }
        return true;
      },
    },
    "shift tab": {
      key: 9,
      shiftKey: true,
      handler(range, context) {
        if (context.format.list) {
          this.quill.format("indent", "-1");
          return false;
        }
        return true;
      },
    },
  },
};

export const quillServiceModules = (toolbarSelector) => ({
  toolbar: {
    container: toolbarSelector,
  },
  keyboard: quillListKeyboard,
});
