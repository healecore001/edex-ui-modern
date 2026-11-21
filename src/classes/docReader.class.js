// pdf.js is now distributed as an ES module only, so it is loaded lazily with a dynamic import
let pdfjsPromise = null;
function loadPdfJs() {
    if (!pdfjsPromise) {
        // Resolved relative to the page (src/ui.html), so it works both in dev and inside the packaged app
        const base = new URL("node_modules/pdfjs-dist/build/", window.location.href);
        pdfjsPromise = import(new URL("pdf.mjs", base).href).then(lib => {
            lib.GlobalWorkerOptions.workerSrc = new URL("pdf.worker.mjs", base).href;
            return lib;
        });
    }
    return pdfjsPromise;
}

class DocReader {
    constructor(opts) {
        const modalElementId = "modal_" + opts.modalId;
        const path = opts.path;
        const scale = 1;
        const modal = document.getElementById(modalElementId);
        const canvas = modal.querySelector(".pdf_canvas");
        const context = canvas.getContext("2d");

        let pdfDoc = null,
            pageNum = 1,
            pageRendering = false,
            pageNumPending = null,
            zoom = 100;

        this.renderPage = (num) => {
            pageRendering = true;
            pdfDoc.getPage(num).then((page) => {
                const viewport = page.getViewport({ scale: scale });
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderTask = page.render({ canvasContext: context, viewport: viewport });
                renderTask.promise.then(() => {
                    pageRendering = false;
                    if (pageNumPending !== null) {
                        const pending = pageNumPending;
                        pageNumPending = null;
                        this.renderPage(pending);
                    }
                });
            });
            modal.querySelector(".page_num").textContent = num;
        };

        this.queueRenderPage = (num) => {
            if (pageRendering) {
                pageNumPending = num;
            } else {
                this.renderPage(num);
            }
        };

        this.onPrevPage = () => {
            if (pageNum <= 1) {
                return;
            }
            pageNum--;
            this.queueRenderPage(pageNum);
        };

        this.onNextPage = () => {
            if (pageNum >= pdfDoc.numPages) {
                return;
            }
            pageNum++;
            this.queueRenderPage(pageNum);
        };

        this.zoomIn = () => {
            if (zoom >= 200) {
                return;
            }
            zoom = zoom + 10;
            canvas.style.zoom = zoom + "%";
        };

        this.zoomOut = () => {
            if (zoom <= 50) {
                return;
            }
            zoom = zoom - 10;
            canvas.style.zoom = zoom + "%";
        };

        modal.querySelector(".previous_page").addEventListener("click", this.onPrevPage);
        modal.querySelector(".next_page").addEventListener("click", this.onNextPage);
        modal.querySelector(".zoom_in").addEventListener("click", this.zoomIn);
        modal.querySelector(".zoom_out").addEventListener("click", this.zoomOut);

        loadPdfJs().then(pdfjsLib => pdfjsLib.getDocument(path).promise).then((pdfDoc_) => {
            pdfDoc = pdfDoc_;
            modal.querySelector(".page_count").textContent = pdfDoc.numPages;
            this.renderPage(pageNum);
        });
    }
}

module.exports = {
    DocReader
};
