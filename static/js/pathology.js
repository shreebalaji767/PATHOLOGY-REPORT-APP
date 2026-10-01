"use strict";


/* =========================================================
   PATHOLOGY REPORT CREATOR

   FEATURES:
   - No database
   - Browser-only storage using IndexedDB
   - No server-side patient/report storage
   - Multiple report sections
   - Optional main heading
   - Optional sub-heading
   - Centered headings
   - Multiple investigations per section
   - Result order:
       TEST NAME
       FLAG
       UNIT
       VALUE
       REFERENCE RANGE
   - A4 portrait print
========================================================= */


document.addEventListener("DOMContentLoaded", () => {


    /* =====================================================
       ELEMENTS
    ====================================================== */

    const sectionsEditor =
        document.getElementById("sectionsEditor");

    const previewSections =
        document.getElementById("previewSections");

    const addSectionBtn =
        document.getElementById("addSectionBtn");

    const cbcTemplateBtn =
        document.getElementById("cbcTemplateBtn");

    const clearSectionsBtn =
        document.getElementById("clearSectionsBtn");

    const generateBtn =
        document.getElementById("generateBtn");

    const printBtn =
        document.getElementById("printBtn");

    const printBtnBottom =
        document.getElementById("printBtnBottom");

    const newReportBtn =
        document.getElementById("newReportBtn");

    const resetBtn =
        document.getElementById("resetBtn");

    const previewBtn =
        document.getElementById("previewBtn");

    const previewModal =
        document.getElementById("previewModal");

    const closePreviewBtn =
        document.getElementById("closePreviewBtn");

    const closePreviewBtn2 =
        document.getElementById("closePreviewBtn2");

    const modalPrintBtn =
        document.getElementById("modalPrintBtn");

    const modalReportContainer =
        document.getElementById("modalReportContainer");



    /* =====================================================
       BROWSER STORAGE ONLY — INDEXEDDB
       No patient/report data is sent to the server.
    ====================================================== */

    const STORAGE_DB = "blssnvj21-pathology-storage";
    const STORAGE_VERSION = 1;
    const DRAFT_KEY = "current-draft";

    let draftSaveTimer = null;

    function openStorageDB() {
        return new Promise((resolve, reject) => {
            if (!("indexedDB" in window)) {
                reject(new Error("IndexedDB is not supported."));
                return;
            }

            const request = indexedDB.open(STORAGE_DB, STORAGE_VERSION);

            request.onupgradeneeded = event => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains("drafts")) {
                    db.createObjectStore("drafts", { keyPath: "id" });
                }

                if (!db.objectStoreNames.contains("reports")) {
                    const store = db.createObjectStore("reports", {
                        keyPath: "id",
                        autoIncrement: true
                    });
                    store.createIndex("savedAt", "savedAt");
                    store.createIndex("patientName", "patientName");
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function collectReportData() {
        const fields = [
            "patientName","patientId","sampleId","age","gender","mobile",
            "refDoctor","department","collectionDate","collectionTime",
            "reportDate","reportTime","specimen","clinicalHistory","method","remarks"
        ];

        const data = { fields: {}, sections: getSectionsData() };

        fields.forEach(id => {
            const el = document.getElementById(id);
            data.fields[id] = el ? el.value : "";
        });

        return data;
    }

    function applyReportData(data) {
        if (!data || !data.fields) return;

        Object.entries(data.fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value || "";
        });

        sectionsEditor.innerHTML = "";

        if (Array.isArray(data.sections) && data.sections.length) {
            data.sections.forEach(section => addSection(section));
        } else {
            addSection();
        }

        updateSectionNumbers();
        generateReport();
    }

    async function saveDraft(showMessage = true) {
        try {
            const db = await openStorageDB();
            const tx = db.transaction("drafts", "readwrite");
            tx.objectStore("drafts").put({
                id: DRAFT_KEY,
                updatedAt: Date.now(),
                data: collectReportData()
            });

            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });

            updateStorageStatus("Draft saved locally");
            if (showMessage) showToast("Draft saved in this browser");
        } catch (error) {
            console.warn("Browser draft save failed:", error);
            updateStorageStatus("Browser storage unavailable");
        }
    }

    async function loadDraft() {
        try {
            const db = await openStorageDB();

            const data = await new Promise((resolve, reject) => {
                const tx = db.transaction("drafts", "readonly");
                const request = tx.objectStore("drafts").get(DRAFT_KEY);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (data?.data) {
                applyReportData(data.data);
                updateStorageStatus("Draft restored from browser");
                showToast("Previous draft restored");
                return true;
            }
        } catch (error) {
            console.warn("Browser draft restore failed:", error);
        }

        return false;
    }

    function scheduleDraftSave() {
        clearTimeout(draftSaveTimer);
        updateStorageStatus("Unsaved changes…");
        draftSaveTimer = setTimeout(() => saveDraft(false), 700);
    }

    function updateStorageStatus(message) {
        const status = document.getElementById("storageStatus");
        if (status) status.textContent = "Browser storage only • " + message;
    }

    async function saveReportToBrowser() {
        const patientName = getValue("patientName");

        if (!patientName) {
            alert("Please enter Patient Name before saving the report.");
            document.getElementById("patientName")?.focus();
            return;
        }

        try {
            const db = await openStorageDB();
            const data = collectReportData();

            const tx = db.transaction("reports", "readwrite");
            tx.objectStore("reports").add({
                patientName,
                sampleId: getValue("sampleId"),
                savedAt: Date.now(),
                data
            });

            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });

            await renderSavedReports();
            showToast("Report saved locally");
        } catch (error) {
            console.error("Report save failed:", error);
            alert("Could not save the report in this browser.");
        }
    }

    async function renderSavedReports() {
        const list = document.getElementById("savedReportsList");
        if (!list) return;

        try {
            const db = await openStorageDB();
            const reports = await new Promise((resolve, reject) => {
                const tx = db.transaction("reports", "readonly");
                const request = tx.objectStore("reports").getAll();
                request.onsuccess = () => resolve(request.result.reverse());
                request.onerror = () => reject(request.error);
            });

            if (!reports.length) {
                list.innerHTML = '<div class="empty-storage">No saved reports in this browser.</div>';
                return;
            }

            list.innerHTML = reports.map(report => {
                const date = new Date(report.savedAt).toLocaleString("en-IN");
                return `
                    <div class="saved-report-item">
                        <div>
                            <strong>${escapeHTML(report.patientName || "Unnamed Patient")}</strong>
                            <span>${escapeHTML(report.sampleId || "No Lab No.")}</span>
                            <small>${escapeHTML(date)}</small>
                        </div>
                        <div class="saved-report-actions">
                            <button type="button" class="btn btn-light load-saved-report" data-id="${report.id}">Load</button>
                            <button type="button" class="btn btn-danger-outline delete-saved-report" data-id="${report.id}">Delete</button>
                        </div>
                    </div>
                `;
            }).join("");

            list.querySelectorAll(".load-saved-report").forEach(button => {
                button.addEventListener("click", async () => {
                    const report = await getSavedReport(Number(button.dataset.id));
                    if (report?.data) {
                        applyReportData(report.data);
                        closeSavedReports();
                        showToast("Saved report loaded");
                    }
                });
            });

            list.querySelectorAll(".delete-saved-report").forEach(button => {
                button.addEventListener("click", async () => {
                    if (!confirm("Delete this saved report from this browser?")) return;
                    await deleteSavedReport(Number(button.dataset.id));
                    renderSavedReports();
                });
            });
        } catch (error) {
            list.innerHTML = '<div class="empty-storage">Browser storage is unavailable.</div>';
        }
    }

    async function getSavedReport(id) {
        const db = await openStorageDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("reports", "readonly");
            const request = tx.objectStore("reports").get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function deleteSavedReport(id) {
        const db = await openStorageDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("reports", "readwrite");
            tx.objectStore("reports").delete(id);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function clearSavedReports() {
        if (!confirm("Delete ALL saved reports from this browser?")) return;

        try {
            const db = await openStorageDB();
            const tx = db.transaction("reports", "readwrite");
            tx.objectStore("reports").clear();

            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onerror = () => reject(tx.error);
            });

            renderSavedReports();
            showToast("All saved reports deleted");
        } catch (error) {
            console.warn("Could not clear saved reports:", error);
        }
    }

    function closeSavedReports() {
        document.getElementById("savedReportsModal")?.classList.remove("active");
    }

    function openSavedReports() {
        document.getElementById("savedReportsModal")?.classList.add("active");
        renderSavedReports();
    }


    /* =====================================================
       UTILITY
    ====================================================== */

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getValue(id) {

        const element =
            document.getElementById(id);

        if (!element) {
            return "";
        }

        return element.value.trim();
    }


    function setText(
        id,
        value,
        fallback = "—"
    ) {

        const element =
            document.getElementById(id);

        if (!element) {
            return;
        }

        element.textContent =
            value || fallback;
    }


    function formatDate(dateString) {

        if (!dateString) {
            return "—";
        }

        const parts =
            dateString.split("-");

        if (parts.length !== 3) {
            return dateString;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }


    function formatTime(timeString) {

        if (!timeString) {
            return "";
        }

        const parts =
            timeString.split(":");

        if (parts.length < 2) {
            return timeString;
        }

        let hours =
            parseInt(parts[0], 10);

        const minutes =
            parts[1];

        const suffix =
            hours >= 12
                ? "PM"
                : "AM";

        hours =
            hours % 12 || 12;

        return `${hours}:${minutes} ${suffix}`;
    }


    function formatCollection() {

        const date =
            formatDate(
                getValue("collectionDate")
            );

        const time =
            formatTime(
                getValue("collectionTime")
            );

        if (date === "—") {
            return "—";
        }

        if (!time) {
            return date;
        }

        return `${date} ${time}`;
    }


    /* =====================================================
       CREATE SECTION
    ====================================================== */

    function addSection(sectionData = {}) {

        const section =
            document.createElement("div");

        section.className =
            "report-section-editor";


        section.innerHTML = `

            <div class="section-editor-header">

                <div>

                    <strong>
                        Report Section
                    </strong>

                    <span class="section-editor-number">
                        01
                    </span>

                </div>

                <div>
                    <button
                        type="button"
                        class="duplicate-section-btn"
                        title="Duplicate section"
                        aria-label="Duplicate section"
                    >
                        ⧉
                    </button>

                    <button
                        type="button"
                        class="remove-section-btn"
                        title="Remove section"
                    >
                        ×
                    </button>
                </div>

            </div>


            <div class="section-heading-fields">


                <div class="form-group">

                    <label>
                        Main Heading
                        <small>
                            Optional
                        </small>
                    </label>

                    <input
                        type="text"
                        class="section-heading-input"
                        placeholder="e.g. HAEMATOLOGY"
                        value="${escapeHTML(sectionData.heading || "")}"
                        autocomplete="off"
                    >

                </div>


                <div class="form-group">

                    <label>
                        Sub-Heading
                        <small>
                            Optional
                        </small>
                    </label>

                    <input
                        type="text"
                        class="section-subheading-input"
                        placeholder="e.g. HAEMOGLOBIN"
                        value="${escapeHTML(sectionData.subheading || "")}"
                        autocomplete="off"
                    >

                </div>


            </div>


            <div class="section-result-toolbar">

                <button
                    type="button"
                    class="btn btn-light add-investigation-btn"
                >
                    + Add Test
                </button>

            </div>


            <div class="section-results-wrapper">

                <table class="section-results-editor">

                    <thead>

                        <tr>

                            <th class="editor-test-no">
                                #
                            </th>

                            <th>
                                TEST NAME
                            </th>

                            <th>
                                FLAG
                            </th>

                            <th>
                                UNIT
                            </th>

                            <th>
                                VALUE
                            </th>

                            <th>
                                REFERENCE RANGE
                            </th>

                            <th class="editor-action">
                                ACTION
                            </th>

                        </tr>

                    </thead>

                    <tbody class="section-results-body"></tbody>

                </table>

            </div>

        `;


        sectionsEditor.appendChild(section);


        const resultsBody =
            section.querySelector(
                ".section-results-body"
            );


        /* =================================================
           ADD INITIAL ROW
        ================================================= */

        if (
            sectionData.results &&
            sectionData.results.length
        ) {

            sectionData.results.forEach(
                result => {

                    addInvestigationRow(
                        resultsBody,
                        result
                    );

                }
            );

        } else {

            addInvestigationRow(
                resultsBody
            );

        }


        /* =================================================
           ADD TEST
        ================================================= */

        section
            .querySelector(
                ".add-investigation-btn"
            )
            .addEventListener(
                "click",
                () => {

                    addInvestigationRow(
                        resultsBody
                    );

                    updateSectionNumbers();

                    generateReport();

                }
            );


        /* =================================================
           REMOVE SECTION
        ================================================= */

        section
            .querySelector(
                ".remove-section-btn"
            )
            .addEventListener(
                "click",
                () => {

                    const sectionCount =
                        sectionsEditor.querySelectorAll(
                            ".report-section-editor"
                        ).length;

                    if (sectionCount <= 1) {

                        alert(
                            "At least one report section is required."
                        );

                        return;
                    }


                    section.remove();

                    updateSectionNumbers();

                    generateReport();

                }
            );


        /* =================================================
           HEADING INPUT EVENTS
        ================================================= */

        section
            .querySelectorAll("input")
            .forEach(input => {

                input.addEventListener(
                    "input",
                    generateReport
                );

            });


        updateSectionNumbers();

    }


    /* =====================================================
       ADD INVESTIGATION ROW
    ====================================================== */

    function addInvestigationRow(
        resultsBody,
        data = {}
    ) {

        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td class="investigation-number">
                1
            </td>


            <td>

                <input
                    type="text"
                    class="investigation-input"
                    placeholder="Test name"
                    value="${escapeHTML(data.test || "")}"
                    autocomplete="off"
                >

            </td>


            <td>

                <select class="flag-input">

                    <option value="">
                        —
                    </option>

                    <option
                        value="Normal"
                        ${data.flag === "Normal" ? "selected" : ""}
                    >
                        Normal
                    </option>

                    <option
                        value="High"
                        ${data.flag === "High" ? "selected" : ""}
                    >
                        High
                    </option>

                    <option
                        value="Low"
                        ${data.flag === "Low" ? "selected" : ""}
                    >
                        Low
                    </option>

                    <option
                        value="Abnormal"
                        ${data.flag === "Abnormal" ? "selected" : ""}
                    >
                        Abnormal
                    </option>

                </select>

            </td>


            <td>

                <input
                    type="text"
                    class="unit-input"
                    placeholder="Unit"
                    value="${escapeHTML(data.unit || "")}"
                    autocomplete="off"
                >

            </td>


            <td>

                <input
                    type="text"
                    class="value-input"
                    placeholder="Value"
                    value="${escapeHTML(data.value || "")}"
                    autocomplete="off"
                >

            </td>


            <td>

                <input
                    type="text"
                    class="range-input"
                    placeholder="Reference range"
                    value="${escapeHTML(data.range || "")}"
                    autocomplete="off"
                >

            </td>


            <td>

                <div class="row-action-group">
                    <button type="button" class="row-move-btn move-up-btn" title="Move test up">↑</button>
                    <button type="button" class="row-move-btn move-down-btn" title="Move test down">↓</button>
                    <button type="button" class="remove-investigation-btn" title="Remove test">×</button>
                </div>

            </td>

        `;


        resultsBody.appendChild(row);


        updateInvestigationNumbers(
            resultsBody
        );


        /* =================================================
           REMOVE ROW
        ================================================= */

        row
            .querySelector(
                ".remove-investigation-btn"
            )
            .addEventListener(
                "click",
                () => {

                    const rows =
                        resultsBody.querySelectorAll(
                            "tr"
                        );

                    if (rows.length <= 1) {

                        row
                            .querySelectorAll("input")
                            .forEach(
                                input => {
                                    input.value = "";
                                }
                            );

                        row
                            .querySelector(
                                ".flag-input"
                            )
                            .selectedIndex = 0;

                    } else {

                        row.remove();

                    }


                    updateInvestigationNumbers(
                        resultsBody
                    );

                    generateReport();

                }
            );


        /* =================================================
           INPUT EVENTS
        ================================================= */

        row
            .querySelectorAll(
                "input, select"
            )
            .forEach(element => {

                element.addEventListener(
                    "input",
                    generateReport
                );

                element.addEventListener(
                    "change",
                    generateReport
                );

            });

    }


    /* =====================================================
       UPDATE SECTION NUMBERS
    ====================================================== */

    function updateSectionNumbers() {

        const sections =
            sectionsEditor.querySelectorAll(
                ".report-section-editor"
            );


        sections.forEach(
            (section, index) => {

                const number =
                    section.querySelector(
                        ".section-editor-number"
                    );

                if (number) {

                    number.textContent =
                        String(index + 1)
                            .padStart(2, "0");

                }


                const body =
                    section.querySelector(
                        ".section-results-body"
                    );

                updateInvestigationNumbers(
                    body
                );

            }
        );

    }


    /* =====================================================
       UPDATE TEST NUMBERS
    ====================================================== */

    function updateInvestigationNumbers(
        resultsBody
    ) {

        if (!resultsBody) {
            return;
        }

        const rows =
            resultsBody.querySelectorAll("tr");


        rows.forEach(
            (row, index) => {

                const number =
                    row.querySelector(
                        ".investigation-number"
                    );

                if (number) {

                    number.textContent =
                        index + 1;

                }

            }
        );

    }


    /* =====================================================
       GET ALL SECTIONS
    ====================================================== */

    function getSectionsData() {

        const sections =
            sectionsEditor.querySelectorAll(
                ".report-section-editor"
            );


        const data = [];


        sections.forEach(section => {


            const heading =
                section
                    .querySelector(
                        ".section-heading-input"
                    )
                    ?.value
                    .trim() || "";


            const subheading =
                section
                    .querySelector(
                        ".section-subheading-input"
                    )
                    ?.value
                    .trim() || "";


            const resultRows =
                section.querySelectorAll(
                    ".section-results-body tr"
                );


            const results = [];


            resultRows.forEach(row => {


                const test =
                    row
                        .querySelector(
                            ".investigation-input"
                        )
                        ?.value
                        .trim() || "";


                const flag =
                    row
                        .querySelector(
                            ".flag-input"
                        )
                        ?.value || "";


                const unit =
                    row
                        .querySelector(
                            ".unit-input"
                        )
                        ?.value
                        .trim() || "";


                const value =
                    row
                        .querySelector(
                            ".value-input"
                        )
                        ?.value
                        .trim() || "";


                const range =
                    row
                        .querySelector(
                            ".range-input"
                        )
                        ?.value
                        .trim() || "";


                if (
                    test ||
                    flag ||
                    unit ||
                    value ||
                    range
                ) {

                    results.push({

                        test,
                        flag,
                        unit,
                        value,
                        range

                    });

                }

            });


            data.push({

                heading,
                subheading,
                results

            });

        });


        return data;

    }


    /* =====================================================
       GENERATE REPORT
    ====================================================== */

    function generateReport() {


        /* =================================================
           PATIENT
        ================================================== */

        setText(
            "previewPatientName",
            getValue("patientName")
        );

        setText(
            "previewPatientId",
            getValue("patientId")
        );


        setText(
            "previewAgeGender",
            [
                getValue("age"),
                getValue("gender")
            ]
                .filter(Boolean)
                .join(" / ")
        );


        setText(
            "previewMobile",
            getValue("mobile")
        );


        setText(
            "previewSampleId",
            getValue("sampleId")
        );


        setText(
            "previewDoctor",
            getValue("refDoctor")
        );


        setText(
            "previewDepartment",
            getValue("department")
        );


        setText(
            "previewReportDate",
            formatDate(
                getValue("reportDate")
            )
        );


        /* =================================================
           SPECIMEN
        ================================================== */

        const specimen =
            getValue("specimen");

        const clinicalHistory =
            getValue("clinicalHistory");

        setText(
            "previewSpecimen",
            specimen
        );


        setText(
            "previewCollection",
            formatCollection()
        );


        setText(
            "previewClinicalHistory",
            clinicalHistory
        );


        const clinicalBox =
            document.getElementById(
                "clinicalHistoryPreviewBox"
            );


        if (clinicalBox) {

            clinicalBox.style.display =
                clinicalHistory
                    ? ""
                    : "none";

        }


        /* =================================================
           METHOD
        ================================================== */

        const method =
            getValue("method");


        setText(
            "previewMethod",
            method
        );


        const methodBox =
            document.getElementById(
                "methodPreviewBox"
            );


        if (methodBox) {

            methodBox.style.display =
                method
                    ? ""
                    : "none";

        }


        /* =================================================
           SECTIONS
        ================================================== */

        const sections =
            getSectionsData();


        previewSections.innerHTML =
            "";


        sections.forEach(
            (section, sectionIndex) => {


                /*
                   Don't print completely empty sections.
                */

                if (
                    !section.heading &&
                    !section.subheading &&
                    section.results.length === 0
                ) {

                    return;

                }


                const sectionElement =
                    document.createElement("div");

                sectionElement.className =
                    "report-section";


                /* =========================================
                   MAIN HEADING
                   OPTIONAL
                ========================================== */

                if (section.heading) {

                    const heading =
                        document.createElement(
                            "div"
                        );

                    heading.className =
                        "report-main-heading";

                    heading.textContent =
                        section.heading.toUpperCase();

                    sectionElement.appendChild(
                        heading
                    );

                }


                /* =========================================
                   SUB HEADING
                   OPTIONAL
                ========================================== */

                if (section.subheading) {

                    const subheading =
                        document.createElement(
                            "div"
                        );

                    subheading.className =
                        "report-sub-heading";

                    subheading.textContent =
                        section.subheading.toUpperCase();

                    sectionElement.appendChild(
                        subheading
                    );

                }


                /* =========================================
                   RESULTS TABLE
                ========================================== */

                if (
                    section.results.length > 0
                ) {

                    const wrapper =
                        document.createElement(
                            "div"
                        );

                    wrapper.className =
                        "report-table-wrapper";


                    const table =
                        document.createElement(
                            "table"
                        );

                    table.className =
                        "report-table";


                    table.innerHTML = `

                        <thead>

                            <tr>

                                <th class="report-no">
                                    #
                                </th>

                                <th>
                                    TEST NAME
                                </th>

                                <th class="report-flag">
                                    FLAG
                                </th>

                                <th class="report-unit">
                                    UNIT
                                </th>

                                <th class="report-result">
                                    VALUE
                                </th>

                                <th>
                                    REFERENCE RANGE
                                </th>

                            </tr>

                        </thead>

                        <tbody></tbody>

                    `;


                    const tbody =
                        table.querySelector(
                            "tbody"
                        );


                    section.results.forEach(
                        (item, index) => {

                            const row =
                                document.createElement(
                                    "tr"
                                );


                            let flagClass =
                                "";


                            if (
                                item.flag ===
                                "Normal"
                            ) {

                                flagClass =
                                    "flag-normal";

                            }


                            if (
                                item.flag ===
                                "High"
                            ) {

                                flagClass =
                                    "flag-high";

                            }


                            if (
                                item.flag ===
                                "Low"
                            ) {

                                flagClass =
                                    "flag-low";

                            }


                            if (
                                item.flag ===
                                "Abnormal"
                            ) {

                                flagClass =
                                    "flag-abnormal";

                            }


                            row.innerHTML = `

                                <td class="report-number-cell">
                                    ${index + 1}
                                </td>

                                <td class="test-name-cell">
                                    ${escapeHTML(item.test)}
                                </td>

                                <td class="${flagClass}">
                                    ${escapeHTML(item.flag || "—")}
                                </td>

                                <td>
                                    ${escapeHTML(item.unit)}
                                </td>

                                <td class="result-value">
                                    ${escapeHTML(item.value)}
                                </td>

                                <td>
                                    ${escapeHTML(item.range)}
                                </td>

                            `;


                            tbody.appendChild(
                                row
                            );

                        }
                    );


                    wrapper.appendChild(
                        table
                    );


                    sectionElement.appendChild(
                        wrapper
                    );

                }


                previewSections.appendChild(
                    sectionElement
                );

            }
        );


        /* =================================================
           REMARKS
        ================================================== */

        const remarks =
            getValue("remarks");


        const remarksBox =
            document.getElementById(
                "previewRemarksBox"
            );


        if (remarks) {

            remarksBox.style.display =
                "";

            setText(
                "previewRemarks",
                remarks
            );

        } else {

            remarksBox.style.display =
                "none";

        }

    }


    /* =====================================================
       CBC TEMPLATE
    ====================================================== */

    function loadCBCTemplate() {


        sectionsEditor.innerHTML =
            "";


        addSection({

            heading:
                "HAEMATOLOGY",

            subheading:
                "COMPLETE BLOOD COUNT",

            results: [

                {
                    test:
                        "Hemoglobin",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "g/dL",

                    range:
                        "Male: 13–17 | Female: 12–15"

                },

                {
                    test:
                        "Total Leukocyte Count",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "cells/µL",

                    range:
                        "4,000–11,000"

                },

                {
                    test:
                        "Neutrophils",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "40–75"

                },

                {
                    test:
                        "Lymphocytes",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "20–45"

                },

                {
                    test:
                        "Eosinophils",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "1–6"

                },

                {
                    test:
                        "Monocytes",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "2–10"

                },

                {
                    test:
                        "Basophils",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "0–2"

                },

                {
                    test:
                        "Platelet Count",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "lakh/µL",

                    range:
                        "1.5–4.5"

                },

                {
                    test:
                        "RBC Count",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "million/µL",

                    range:
                        "Male: 4.5–5.9 | Female: 4.0–5.2"

                },

                {
                    test:
                        "PCV / Hematocrit",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "Male: 40–54 | Female: 36–46"

                },

                {
                    test:
                        "MCV",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "fL",

                    range:
                        "80–100"

                },

                {
                    test:
                        "MCH",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "pg",

                    range:
                        "27–33"

                },

                {
                    test:
                        "MCHC",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "g/dL",

                    range:
                        "32–36"

                },

                {
                    test:
                        "RDW",

                    value:
                        "",

                    flag:
                        "",

                    unit:
                        "%",

                    range:
                        "11.5–14.5"

                }

            ]

        });


        generateReport();

    }



    /* =====================================================
       QUICK TEMPLATE LIBRARY
    ====================================================== */

    function loadQuickTemplate(type) {

        const templates = {

            lft: {
                heading: "BIOCHEMISTRY",
                subheading: "LIVER FUNCTION TEST",
                results: [
                    {test:"Total Bilirubin",unit:"mg/dL",range:"0.2–1.2"},
                    {test:"Direct Bilirubin",unit:"mg/dL",range:"0.0–0.3"},
                    {test:"Indirect Bilirubin",unit:"mg/dL",range:"0.2–0.9"},
                    {test:"AST (SGOT)",unit:"U/L",range:"5–40"},
                    {test:"ALT (SGPT)",unit:"U/L",range:"7–56"},
                    {test:"Alkaline Phosphatase",unit:"U/L",range:"44–147"},
                    {test:"Total Protein",unit:"g/dL",range:"6.0–8.3"},
                    {test:"Albumin",unit:"g/dL",range:"3.5–5.0"},
                    {test:"Globulin",unit:"g/dL",range:"2.0–3.5"}
                ]
            },

            kft: {
                heading: "BIOCHEMISTRY",
                subheading: "KIDNEY FUNCTION TEST",
                results: [
                    {test:"Blood Urea",unit:"mg/dL",range:"15–45"},
                    {test:"Serum Creatinine",unit:"mg/dL",range:"0.6–1.3"},
                    {test:"Uric Acid",unit:"mg/dL",range:"3.5–7.2"},
                    {test:"Sodium",unit:"mmol/L",range:"135–145"},
                    {test:"Potassium",unit:"mmol/L",range:"3.5–5.1"},
                    {test:"Chloride",unit:"mmol/L",range:"98–106"}
                ]
            },

            lipid: {
                heading: "BIOCHEMISTRY",
                subheading: "LIPID PROFILE",
                results: [
                    {test:"Total Cholesterol",unit:"mg/dL",range:"Desirable: <200"},
                    {test:"Triglycerides",unit:"mg/dL",range:"Normal: <150"},
                    {test:"HDL Cholesterol",unit:"mg/dL",range:">40"},
                    {test:"LDL Cholesterol",unit:"mg/dL",range:"Optimal: <100"},
                    {test:"VLDL Cholesterol",unit:"mg/dL",range:"5–40"},
                    {test:"TC / HDL Ratio",unit:"Ratio",range:"<5.0"}
                ]
            },

            thyroid: {
                heading: "ENDOCRINOLOGY",
                subheading: "THYROID PROFILE",
                results: [
                    {test:"T3",unit:"ng/mL",range:"0.8–2.0"},
                    {test:"T4",unit:"µg/dL",range:"5.0–12.0"},
                    {test:"TSH",unit:"µIU/mL",range:"0.4–4.0"}
                ]
            },

            urine: {
                heading: "CLINICAL PATHOLOGY",
                subheading: "URINE ROUTINE / MICROSCOPY",
                results: [
                    {test:"Colour",unit:"",range:"Pale yellow"},
                    {test:"Appearance",unit:"",range:"Clear"},
                    {test:"Specific Gravity",unit:"",range:"1.005–1.030"},
                    {test:"pH",unit:"",range:"4.5–8.0"},
                    {test:"Protein",unit:"",range:"Negative"},
                    {test:"Glucose",unit:"",range:"Negative"},
                    {test:"Ketone",unit:"",range:"Negative"},
                    {test:"Bilirubin",unit:"",range:"Negative"},
                    {test:"Urobilinogen",unit:"",range:"Normal"},
                    {test:"RBC",unit:"/HPF",range:"0–2"},
                    {test:"Pus Cells",unit:"/HPF",range:"0–5"},
                    {test:"Epithelial Cells",unit:"/HPF",range:"Few"},
                    {test:"Casts",unit:"/LPF",range:"Nil"},
                    {test:"Crystals",unit:"",range:"Nil"},
                    {test:"Bacteria",unit:"",range:"Nil"}
                ]
            }
        };

        if (type === "cbc") {
            loadCBCTemplate();
            return;
        }

        const template = templates[type];
        if (!template) return;

        sectionsEditor.innerHTML = "";
        addSection(template);
        generateReport();
        showToast("Template loaded");
    }


    function showToast(message) {
        let toast = document.getElementById("appToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "appToast";
            toast.className = "app-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(window.__pathologyToastTimer);
        window.__pathologyToastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 1800);
    }


    /* =====================================================
       CLEAR SECTIONS
    ====================================================== */

    function clearSections() {

        sectionsEditor.innerHTML =
            "";

        addSection();

        generateReport();

    }


    /* =====================================================
       RESET FORM
    ====================================================== */

    function resetForm(skipConfirmation = false) {


        if (!skipConfirmation) {
            const confirmed =
                window.confirm(
                    "Clear the complete pathology report?"
                );

            if (!confirmed) {
                return;
            }
        }


        document
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(element => {

                if (
                    element.tagName ===
                    "SELECT"
                ) {

                    element.selectedIndex =
                        0;

                } else {

                    element.value =
                        "";

                }

            });


        const today =
            new Date();


        const dateString =
            today.getFullYear() +
            "-" +
            String(today.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(today.getDate()).padStart(2, "0");


        document.getElementById(
            "reportDate"
        ).value =
            dateString;


        sectionsEditor.innerHTML =
            "";


        addSection();


        generateReport();
        openStorageDB().then(db => {
            const tx = db.transaction("drafts", "readwrite");
            tx.objectStore("drafts").delete(DRAFT_KEY);
        }).catch(() => {});
        updateStorageStatus("New report");
    }


    /* =====================================================
       NEW REPORT
    ====================================================== */

    function newReport() {


        const confirmed =
            window.confirm(
                "Start a new report? Current unsaved data will be cleared."
            );


        if (!confirmed) {
            return;
        }


        resetForm(true);

    }


    /* =====================================================
       PRINT
    ====================================================== */

    function printReport() {

        const patientName = getValue("patientName");

        if (!patientName) {
            alert("Please enter Patient Name before printing the report.");
            document.getElementById("patientName")?.focus();
            return;
        }

        generateReport();
        window.print();

    }


    /* =====================================================
       OPEN PREVIEW
    ====================================================== */

    function openPreview() {

        generateReport();


        modalReportContainer.innerHTML =
            "";


        const clone =
            document
                .getElementById(
                    "printArea"
                )
                .cloneNode(true);


        clone.classList.remove(
            "print-area"
        );


        modalReportContainer.appendChild(
            clone
        );


        previewModal
            .classList
            .add("active");

    }


    /* =====================================================
       CLOSE PREVIEW
    ====================================================== */

    function closePreview() {

        previewModal
            .classList
            .remove("active");

    }


    /* =====================================================
       EVENT LISTENERS
    ====================================================== */

    document.getElementById("saveDraftBtn")?.addEventListener(
        "click",
        () => saveDraft(true)
    );

    document.getElementById("saveReportBtn")?.addEventListener(
        "click",
        saveReportToBrowser
    );

    document.getElementById("savedReportsBtn")?.addEventListener(
        "click",
        openSavedReports
    );

    document.getElementById("closeSavedReportsBtn")?.addEventListener(
        "click",
        closeSavedReports
    );

    document.querySelector("#savedReportsModal .modal-backdrop")?.addEventListener(
        "click",
        closeSavedReports
    );

    document.getElementById("clearSavedReportsBtn")?.addEventListener(
        "click",
        clearSavedReports
    );

    addSectionBtn.addEventListener(
        "click",
        () => {

            addSection();

            generateReport();

        }
    );


    cbcTemplateBtn.addEventListener(
        "click",
        () => loadQuickTemplate("cbc")
    );

    const quickTemplateSelect = document.getElementById("quickTemplateSelect");

    if (quickTemplateSelect) {
        quickTemplateSelect.addEventListener("change", () => {
            const type = quickTemplateSelect.value;
            if (type) {
                loadQuickTemplate(type);
                quickTemplateSelect.value = "";
            }
        });
    }


    clearSectionsBtn.addEventListener(
        "click",
        clearSections
    );


    generateBtn.addEventListener(
        "click",
        generateReport
    );


    printBtn.addEventListener(
        "click",
        printReport
    );


    printBtnBottom.addEventListener(
        "click",
        printReport
    );


    newReportBtn.addEventListener(
        "click",
        newReport
    );


    resetBtn.addEventListener(
        "click",
        resetForm
    );


    previewBtn.addEventListener(
        "click",
        openPreview
    );


    closePreviewBtn.addEventListener(
        "click",
        closePreview
    );


    closePreviewBtn2.addEventListener(
        "click",
        closePreview
    );


    modalPrintBtn.addEventListener(
        "click",
        () => {

            closePreview();

            setTimeout(
                printReport,
                150
            );

        }
    );


    previewModal
        .querySelector(
            ".modal-backdrop"
        )
        .addEventListener(
            "click",
            closePreview
        );


    /* =====================================================
       GENERAL FORM INPUT EVENTS
    ====================================================== */

    document
        .querySelectorAll(
            "#patientName, #patientId, #sampleId, #age, #gender, #mobile, #refDoctor, #department, #collectionDate, #collectionTime, #reportDate, #reportTime, #specimen, #clinicalHistory, #method, #remarks"
        )
        .forEach(element => {

            element.addEventListener(
                "input",
                generateReport
            );

            element.addEventListener(
                "change",
                generateReport
            );

        });




    document.addEventListener("input", event => {
        if (event.target.matches("input, textarea, select")) {
            scheduleDraftSave();
        }
    });

    document.addEventListener("change", event => {
        if (event.target.matches("input, textarea, select")) {
            scheduleDraftSave();
        }
    });

    /* =====================================================
       PWA / OFFLINE SUPPORT
    ====================================================== */

    let deferredInstallPrompt = null;
    const installAppBtn = document.getElementById("installAppBtn");

    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (installAppBtn) {
            installAppBtn.hidden = false;
        }
    });

    if (installAppBtn) {
        installAppBtn.addEventListener("click", async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            installAppBtn.hidden = true;
        });
    }

    window.addEventListener("appinstalled", () => {
        deferredInstallPrompt = null;
        if (installAppBtn) installAppBtn.hidden = true;
        if (typeof showToast === "function") showToast("SBH Pathology installed");
    });

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js", { scope: "/" })
                .then(registration => {
                    registration.update();

                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (!newWorker) return;

                        newWorker.addEventListener("statechange", () => {
                            if (
                                newWorker.state === "installed" &&
                                navigator.serviceWorker.controller
                            ) {
                                showToast("New version available — reload the app");
                            }
                        });
                    });
                })
                .catch(error => {
                    console.warn("PWA service worker registration failed:", error);
                });
        });
    }

    /* =====================================================
       ONLINE / OFFLINE STATUS
    ====================================================== */

    function updateConnectionStatus() {
        if (navigator.onLine) {
            showToast("Online — latest app version connected");
        } else {
            showToast("Offline — app remains available");
        }
    }

    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);


    /* =====================================================
       KEYBOARD SHORTCUTS
    ====================================================== */

    document.addEventListener("keydown", event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
            event.preventDefault();
            printReport();
        }

        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            generateReport();
            showToast("Report refreshed");
        }

        if (event.key === "Escape" && previewModal.classList.contains("active")) {
            closePreview();
        }
    });


    /* =====================================================
       INITIALIZATION
    ====================================================== */

    const today = new Date();

    const dateString =
        today.getFullYear() +
        "-" +
        String(today.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(today.getDate()).padStart(2, "0");


    document.getElementById(
        "reportDate"
    ).value =
        dateString;


    addSection();

    generateReport();

    // Restore the browser-only draft after the editor has been initialized.
    loadDraft();
});