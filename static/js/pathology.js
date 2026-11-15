"use strict";


/* =========================================================
   PATHOLOGY REPORT CREATOR

   FEATURES:
   - No database
   - Browser-only storage using localStorage
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
       BROWSER STORAGE ONLY — LOCALSTORAGE
       No patient/report data is sent to the server.
    ====================================================== */

    /* LOCALSTORAGE-ONLY STORAGE */
    const STORAGE_KEY = "pathology-report-app-v1";
    const DRAFT_KEY = "current-draft";
    const LEGACY_DB_NAME = "blssnvj21-pathology-storage";
    let draftSaveTimer = null;

    function readStore() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            return {
                reports: Array.isArray(value.reports) ? value.reports : [],
                draft: value.draft && typeof value.draft === "object" ? value.draft : null,
                nextId: Number.isSafeInteger(value.nextId) && value.nextId > 0 ? value.nextId : 1
            };
        } catch (error) {
            console.warn("Could not read local report storage:", error);
            return { reports: [], draft: null, nextId: 1 };
        }
    }

    function writeStore(store) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
            updateStorageStatus("Saved in this browser");
            return true;
        } catch (error) {
            console.error("LocalStorage write failed:", error);
            updateStorageStatus("Storage full/unavailable — export your data");
            showToast("Save failed: browser storage may be full");
            return false;
        }
    }

    function collectReportData() {
        const fields = ["patientName","patientId","sampleId","age","gender","mobile","refDoctor","department","collectionDate","collectionTime","reportDate","reportTime","specimen","clinicalHistory","method","remarks"];
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
        if (Array.isArray(data.sections) && data.sections.length) data.sections.forEach(section => addSection(section));
        else addSection();
        updateSectionNumbers();
        generateReport();
    }

    async function saveDraft(showMessage = true) {
        const store = readStore();
        store.draft = { updatedAt: Date.now(), data: collectReportData() };
        if (writeStore(store)) {
            updateStorageStatus("Draft saved locally");
            if (showMessage) showToast("Draft saved in this browser");
        }
    }

    async function loadDraft() {
        const draft = readStore().draft;
        if (!draft?.data) return false;
        applyReportData(draft.data);
        updateStorageStatus("Draft restored from localStorage");
        showToast("Previous draft restored");
        return true;
    }

    function scheduleDraftSave() {
        clearTimeout(draftSaveTimer);
        updateStorageStatus("Unsaved changes…");
        draftSaveTimer = setTimeout(() => saveDraft(false), 700);
    }

    function updateStorageStatus(message) {
        const status = document.getElementById("storageStatus");
        if (status) status.textContent = "LocalStorage only • " + message;
    }

    async function saveReportToBrowser() {
        const patientName = getValue("patientName");
        if (!patientName) {
            alert("Please enter Patient Name before saving the report.");
            document.getElementById("patientName")?.focus();
            return;
        }
        const store = readStore();
        store.reports.push({
            id: store.nextId++,
            patientName,
            sampleId: getValue("sampleId"),
            savedAt: Date.now(),
            data: collectReportData()
        });
        if (!writeStore(store)) {
            alert("Could not save. Export existing records and free browser storage space.");
            return;
        }
        await renderSavedReports();
        showToast("Report saved locally");
    }

    async function renderSavedReports() {
        const list = document.getElementById("savedReportsList");
        if (!list) return;
        const reports = readStore().reports.slice().sort((x, y) => (y.savedAt || 0) - (x.savedAt || 0));
        if (!reports.length) {
            list.innerHTML = '<div class="empty-storage">No saved reports in this browser.</div>';
            return;
        }
        list.innerHTML = reports.map(report => {
            const date = new Date(report.savedAt || Date.now()).toLocaleString("en-IN");
            return `
                <div class="saved-report-item">
                    <div><strong>${escapeHTML(report.patientName || "Unnamed Patient")}</strong>
                    <span>${escapeHTML(report.sampleId || "No Lab No.")}</span>
                    <small>${escapeHTML(date)}</small></div>
                    <div class="saved-report-actions">
                        <button type="button" class="btn btn-light load-saved-report" data-id="${report.id}">Load</button>
                        <button type="button" class="btn btn-danger-outline delete-saved-report" data-id="${report.id}">Delete</button>
                    </div>
                </div>`;
        }).join("");
        list.querySelectorAll(".load-saved-report").forEach(button => button.addEventListener("click", () => {
            const report = getSavedReport(Number(button.dataset.id));
            if (report?.data) {
                applyReportData(report.data);
                closeSavedReports();
                showToast("Saved report loaded");
            }
        }));
        list.querySelectorAll(".delete-saved-report").forEach(button => button.addEventListener("click", () => {
            if (!confirm("Delete this saved report from this browser?")) return;
            deleteSavedReport(Number(button.dataset.id));
            renderSavedReports();
        }));
    }

    function getSavedReport(id) {
        return readStore().reports.find(report => Number(report.id) === Number(id));
    }

    function deleteSavedReport(id) {
        const store = readStore();
        store.reports = store.reports.filter(report => Number(report.id) !== Number(id));
        writeStore(store);
    }

    async function clearSavedReports() {
        if (!confirm("Delete ALL saved reports from this browser?")) return;
        const store = readStore();
        store.reports = [];
        if (writeStore(store)) {
            await renderSavedReports();
            showToast("All saved reports deleted");
        }
    }

    function exportAllData() {
        const store = readStore();
        const backup = {
            app: "Pathology Report Creator",
            formatVersion: 1,
            exportedAt: new Date().toISOString(),
            reports: store.reports,
            draft: store.draft
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "pathology-reports-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast("Backup exported");
    }

    async function importAllData(file) {
        if (!file) return;
        try {
            const backup = JSON.parse(await file.text());
            if (!backup || backup.formatVersion !== 1 || !Array.isArray(backup.reports)) {
                throw new Error("Unsupported backup file.");
            }
            const valid = backup.reports.every(report =>
                report && report.data && report.data.fields &&
                typeof report.data.fields === "object" && Array.isArray(report.data.sections)
            );
            if (!valid || (backup.draft && (!backup.draft.data || !backup.draft.data.fields))) {
                throw new Error("Backup validation failed. No records were imported.");
            }
            if (!confirm("Import " + backup.reports.length + " report(s)? Existing reports will be kept and imported reports added.")) return;
            const store = readStore();
            const now = Date.now();
            backup.reports.forEach(report => store.reports.push({
                id: store.nextId++,
                patientName: String(report.patientName || ""),
                sampleId: String(report.sampleId || ""),
                savedAt: Number(report.savedAt) || now,
                data: report.data
            }));
            if (backup.draft) store.draft = backup.draft;
            if (!writeStore(store)) throw new Error("Import could not be saved. Export current data and free browser storage.");
            await renderSavedReports();
            showToast(backup.reports.length + " report(s) imported");
        } catch (error) {
            alert("Import failed: " + error.message);
        }
    }

    // Migrate prior IndexedDB records once, then remove the old database.
    async function migrateLegacyReportsOnce() {
        const marker = STORAGE_KEY + "-legacy-migrated";
        if (localStorage.getItem(marker) === "yes" || !("indexedDB" in window)) return;
        let db;
        try {
            db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(LEGACY_DB_NAME);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
                request.onupgradeneeded = () => {
                    request.transaction.abort();
                    reject(new Error("No legacy database"));
                };
            });
            if (!db.objectStoreNames.contains("reports")) {
                db.close();
                localStorage.setItem(marker, "yes");
                indexedDB.deleteDatabase(LEGACY_DB_NAME);
                return;
            }
            const legacy = await new Promise((resolve, reject) => {
                const tx = db.transaction(["reports", "drafts"], "readonly");
                const result = { reports: [], draft: null };
                const reportsRequest = tx.objectStore("reports").getAll();
                reportsRequest.onsuccess = () => { result.reports = reportsRequest.result || []; };
                reportsRequest.onerror = () => reject(reportsRequest.error);
                if (db.objectStoreNames.contains("drafts")) {
                    const draftRequest = tx.objectStore("drafts").get(DRAFT_KEY);
                    draftRequest.onsuccess = () => { result.draft = draftRequest.result || null; };
                    draftRequest.onerror = () => reject(draftRequest.error);
                }
                tx.oncomplete = () => resolve(result);
                tx.onerror = () => reject(tx.error);
            });
            const store = readStore();
            legacy.reports.forEach(report => store.reports.push({
                id: store.nextId++,
                patientName: String(report.patientName || ""),
                sampleId: String(report.sampleId || ""),
                savedAt: Number(report.savedAt) || Date.now(),
                data: report.data
            }));
            if (!store.draft && legacy.draft?.data) store.draft = legacy.draft;
            if (!writeStore(store)) {
                db.close();
                showToast("Old records were kept; export data and free storage to migrate");
                return;
            }
            db.close();
            localStorage.setItem(marker, "yes");
            indexedDB.deleteDatabase(LEGACY_DB_NAME);
            if (legacy.reports.length) showToast(legacy.reports.length + " previous report(s) migrated");
        } catch (error) {
            if (db) db.close();
            console.warn("Legacy local-data migration skipped:", error);
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
                                VALUE
                            </th>

                            <th>
                                UNIT
                            </th>

                            <th>
                                REFERENCE RANGE
                            </th>

                            <th>
                                INTERPRETATION & REMARKS
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
                    class="value-input"
                    placeholder="Value"
                    value="${escapeHTML(data.value || "")}"
                    autocomplete="off"
                >

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
                    class="range-input"
                    placeholder="Reference range"
                    value="${escapeHTML(data.range || "")}"
                    autocomplete="off"
                >

            </td>


            <td>
                <textarea
                    class="test-remarks-input"
                    rows="2"
                    placeholder="Optional interpretation / remarks"
                    aria-label="Interpretation and remarks for this test"
                >${escapeHTML(data.remarks || "")}</textarea>
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

                        const testRemarksInput = row.querySelector(".test-remarks-input");
                        if (testRemarksInput) testRemarksInput.value = "";

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
                "input, select, textarea"
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

                const remarks = row.querySelector(".test-remarks-input")?.value.trim() || "";

                if (
                    test ||
                    flag ||
                    unit ||
                    value ||
                    range ||
                    remarks
                ) {

                    results.push({

                        test,
                        flag,
                        unit,
                        value,
                        range,
                        remarks

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


                    // Show the FLAG column only when at least one result has a flag.
                    const showFlagColumn = section.results.some(
                        item => String(item.flag || "").trim() !== ""
                    );

                    table.innerHTML = `

                        <thead>

                            <tr>

                                <th class="report-no">
                                    #
                                </th>

                                <th>
                                    TEST NAME
                                </th>

                                ${showFlagColumn ? '<th class="report-flag">FLAG</th>' : ""}

                                <th class="report-result">
                                    VALUE
                                </th>

                                <th class="report-unit">
                                    UNIT
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

                                ${showFlagColumn ? `<td class="${flagClass}">${escapeHTML(item.flag)}</td>` : ""}

                                <td class="result-value">
                                    ${escapeHTML(item.value)}
                                </td>

                                <td>
                                    ${escapeHTML(item.unit)}
                                </td>

                                <td>
                                    ${escapeHTML(item.range)}
                                </td>

                            `;


                            tbody.appendChild(row);

                            const testRemarks = String(item.remarks || "").trim();
                            if (testRemarks) {
                                const remarksRow = document.createElement("tr");
                                remarksRow.className = "test-remarks-report-row";
                                const columnCount = showFlagColumn ? 6 : 5;
                                remarksRow.innerHTML = '<td colspan="' + columnCount + '" class="test-remarks-report-cell"><strong>Interpretation &amp; Remarks:</strong> ' + escapeHTML(testRemarks).replace(/\\n/g, "<br>") + "</td>";
                                tbody.appendChild(remarksRow);
                            }

                            // Add the Vitamin B12 interpretation guide directly below this test only.
                            if (/vitamin\s*b\s*12|cyanocobalamin/i.test(String(item.test || ""))) {
                                const guideRow = document.createElement("tr");
                                guideRow.className = "b12-interpretation-row";
                                const guideColspan = showFlagColumn ? 6 : 5;
                                guideRow.innerHTML = `
                                    <td colspan="${guideColspan}" class="b12-interpretation-cell">
                                        <div class="b12-guide-title">INTERPRETATION</div>
                                        <div class="b12-guide-intro">
                                            <strong>Vitamin B12</strong>, also known as Cyanocobalamin in its synthetic form, is an essential water-soluble vitamin that plays a key role in:
                                            <ul>
                                                <li>Red blood cell production — helps prevent megaloblastic anemia</li>
                                                <li>Nervous system health — maintains the myelin sheath around nerves</li>
                                                <li>DNA synthesis — vital for cell division</li>
                                                <li>Energy metabolism — helps convert food into energy</li>
                                            </ul>
                                        </div>
                                        <div class="b12-guide-columns">
                                            <div>
                                                <strong>Deficiency symptoms</strong>
                                                <ul>
                                                    <li>Fatigue and weakness</li>
                                                    <li>Numbness or tingling in hands/feet</li>
                                                    <li>Memory issues or confusion</li>
                                                    <li>Glossitis (inflamed tongue)</li>
                                                    <li>Megaloblastic anemia</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <strong>Sources</strong>
                                                <ul>
                                                    <li>Animal-based foods: meat (especially liver), fish, eggs, dairy</li>
                                                    <li>Fortified foods: cereals, plant milks, nutritional yeast</li>
                                                    <li>Supplements: tablets, injections, sublingual drops</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <table class="b12-level-table">
                                            <thead><tr><th>Level (pg/mL)</th><th>Status</th><th>Possible effects / clinical significance</th></tr></thead>
                                            <tbody>
                                                <tr class="b12-level-deficient"><td>&lt;145</td><td>Deficient</td><td>Below the supplied laboratory reference interval.</td></tr>
                                                <tr class="b12-level-borderline"><td>145–179</td><td>Indeterminate</td><td>Indeterminate range according to the supplied laboratory reference interval.</td></tr>
                                                <tr class="b12-level-lownormal"><td>180–914</td><td>Normal</td><td>Within the supplied laboratory reference interval.</td></tr>
                                                <tr class="b12-level-high"><td>&gt;914</td><td>Hypercobalaminemia</td><td>Elevated Vitamin B12; interpret with clinical context and supplementation history.</td></tr>
                                            </tbody>
                                        </table>
                                        <div class="b12-guide-note">Interpret results alongside the laboratory reference interval, symptoms, and clinical context. This guide is informational and does not replace clinical assessment.</div>
                                    </td>
                                `;
                                tbody.appendChild(guideRow);
                            }

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
       CBC TEMPLATE — 19 PARAMETERS
       Reference intervals supplied for the user's report format.
    ====================================================== */

    function loadCBCTemplate() {
        sectionsEditor.innerHTML = "";

        addSection({
            heading: "HAEMATOLOGY",
            subheading: "COMPLETE BLOOD COUNT (CBC)",
            results: [
                { test: "WBC", value: "", flag: "", unit: "×10³/µL", range: "4.0–10.0 ×10³/µL" },
                { test: "Lymph#", value: "", flag: "", unit: "×10³/µL", range: "1.0–4.0 ×10³/µL" },
                { test: "Mid#", value: "", flag: "", unit: "×10³/µL", range: "0.1–1.2 ×10³/µL" },
                { test: "Gran#", value: "", flag: "", unit: "×10³/µL", range: "1.5–7.0 ×10³/µL" },
                { test: "Lymph%", value: "", flag: "", unit: "%", range: "20.0–40.0 %" },
                { test: "Mid%", value: "", flag: "", unit: "%", range: "3.0–14.0 %" },
                { test: "Gran%", value: "", flag: "", unit: "%", range: "50.0–70.0 %" },
                { test: "HGB", value: "", flag: "", unit: "g/dL", range: "11.0–15.0 g/dL" },
                { test: "RBC", value: "", flag: "", unit: "million/µL", range: "3.50–5.0 million/µL" },
                { test: "HCT", value: "", flag: "", unit: "%", range: "37.0–47.0 %" },
                { test: "MCV", value: "", flag: "", unit: "fL", range: "80.0–100.0 fL" },
                { test: "MCH", value: "", flag: "", unit: "pg", range: "27.0–34.0 pg" },
                { test: "MCHC", value: "", flag: "", unit: "g/dL", range: "32.0–36.0 g/dL" },
                { test: "RDW-CV", value: "", flag: "", unit: "%", range: "11.0–16.0 %" },
                { test: "RDW-SD", value: "", flag: "", unit: "fL", range: "35.0–56.0 fL" },
                { test: "PLT", value: "", flag: "", unit: "×10³/µL", range: "150–450 ×10³/µL" },
                { test: "MPV", value: "", flag: "", unit: "fL", range: "6.5–12.0 fL" },
                { test: "PDW", value: "", flag: "", unit: "%", range: "9.0–17.0 %" },
                { test: "PCT", value: "", flag: "", unit: "%", range: "0.108–0.282 %" }
            ]
        });

        generateReport();
        showToast("CBC template loaded — 19 parameters");
    }


    /* =====================================================
       QUICK TEMPLATE LIBRARY
    ====================================================== */

    function loadQuickTemplate(type) {

        // Add selected templates to the current report without removing existing sections.
        if (Array.isArray(type)) {
            const selectedTypes = [...new Set(type)].filter(Boolean);
            if (!selectedTypes.length) {
                showToast("Select at least one template");
                return;
            }

            // Keep any sections already in the report, including manually edited sections.
            const combinedSections = [];
            while (sectionsEditor.firstElementChild) {
                combinedSections.push(sectionsEditor.removeChild(sectionsEditor.firstElementChild));
            }

            selectedTypes.forEach(selectedType => {
                loadQuickTemplate(selectedType);

                // Detach each newly created section so the next template can be loaded safely.
                while (sectionsEditor.firstElementChild) {
                    combinedSections.push(sectionsEditor.removeChild(sectionsEditor.firstElementChild));
                }
            });

            combinedSections.forEach(section => sectionsEditor.appendChild(section));
            updateSectionNumbers();
            generateReport();
            showToast(selectedTypes.length + " template(s) added");
            return;
        }

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
            },

            fpg: {
                heading: "BIOCHEMISTRY",
                subheading: "FASTING PLASMA GLUCOSE",
                results: [
                    {
                        test: "Fasting Plasma Glucose",
                        value: "",
                        unit: "mg/dL",
                        range: "70–99: Normal; 100–125: Prediabetes; ≥126: Diabetes*"
                    }
                ]
            },

            calcium: {
                heading: "BIOCHEMISTRY",
                subheading: "SERUM CALCIUM",
                results: [
                    {
                        test: "Calcium, Serum (Method: Arsenazo)",
                        value: "",
                        unit: "mg/dL",
                        range: "8.8–10.6"
                    }
                ]
            },

            b12: {
                heading: "BIOCHEMISTRY",
                subheading: "VITAMIN B12 (CYANOCOBALAMIN)",
                results: [
                    {
                        test: "Vitamin B12 (Cyanocobalamin)",
                        value: "",
                        unit: "pg/mL",
                        range: "< 145 - Deficient\\n> 914 - Hypercobalaminemia\\n180–914: Normal\\n145–179: Indeterminate"
                    }
                ]
            },

            vitaminD: {
                heading: "BIOCHEMISTRY",
                subheading: "VITAMIN D TOTAL (D2+D3 FRACTIONATED)",
                results: [
                    {
                        test: "Vitamin D Total (D2+D3 Fractionated)",
                        value: "",
                        unit: "ng/mL",
                        range: "Deficiency : < 20\\nInsufficiency : 20-29\\nOptimum Level : 30-80\\nPossible Toxicity : > 150"
                    },
                    {
                        test: "(Method: Chemiluminescence)",
                        value: "",
                        unit: "",
                        range: ""
                    }
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

        if (type === "fpg") {
            const specimen = document.getElementById("specimen");
            const method = document.getElementById("method");
            if (specimen) specimen.value = "Plasma";
            if (method) method.value = "Hexokinase";
        } else if (type === "calcium") {
            const specimen = document.getElementById("specimen");
            const method = document.getElementById("method");
            const remarks = document.getElementById("remarks");
            if (specimen) specimen.value = "Serum";
            if (method) method.value = "Arsenazo";
            if (remarks) remarks.value = "Calcium is useful to help diagnose and monitor many types of medical conditions, including conditions\nthat affect your bones, kidneys, digestive system, thyroid, and parathyroid glands.\nIncreased levels of calcium may cause Osteopor0esis, kidney stones, renal failure, dementia, abnormal heart rhythm.";
        } else if (type === "vitaminD") {
            const specimen = document.getElementById("specimen");
            const method = document.getElementById("method");
            const remarks = document.getElementById("remarks");
            if (specimen) specimen.value = "Serum";
            if (method) method.value = "Chemiluminescence";
            if (remarks) {
                const currentRemarks = remarks.value.trim();
                const containsLegacyVitaminDText =
                    /IN REMARKS|INTERPRETATION CHART|\\?\\?\\*?LEVEL\\*?|svg\\s*svg/i.test(currentRemarks) ||
                    (currentRemarks.includes("\\\\#") && currentRemarks.toUpperCase().includes("INTERPRETATION")) ||
                    currentRemarks.includes("\\\\**Note");
                if (!currentRemarks || containsLegacyVitaminDText) {
                    remarks.value = vitaminDInterpretationRemarks;
                }
            }
        }

        generateReport();
        showToast(
            type === "fpg" ? "Fasting Plasma Glucose template loaded" :
            type === "calcium" ? "Serum Calcium template loaded" :
            "Template loaded"
        );
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
        const store = readStore();
        store.draft = null;
        writeStore(store);
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
    document.getElementById("exportDataBtn")?.addEventListener("click", exportAllData);
    const importDataBtn = document.getElementById("importDataBtn");
    const importDataFile = document.getElementById("importDataFile");
    importDataBtn?.addEventListener("click", () => importDataFile?.click());
    importDataFile?.addEventListener("change", async () => {
        await importAllData(importDataFile.files?.[0]);
        importDataFile.value = "";
    });

    addSectionBtn.addEventListener(
        "click",
        () => {

            addSection();

            generateReport();

        }
    );


    const quickTemplateSelect = document.getElementById("quickTemplateSelect");
    const loadSelectedTemplatesBtn = document.getElementById("loadSelectedTemplatesBtn");

    if (quickTemplateSelect && loadSelectedTemplatesBtn) {
        loadSelectedTemplatesBtn.addEventListener("click", () => {
            const selectedTypes = Array.from(quickTemplateSelect.selectedOptions)
                .map(option => option.value)
                .filter(Boolean);
            loadQuickTemplate(selectedTypes);
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
       VITAMIN D DEFAULT REMARKS
    ====================================================== */

    const vitaminDInterpretationRemarks = `INTERPRETATION

LEVEL — REFERENCE RANGE (ng/mL) — COMMENTS

Severe deficiency — < 10
Could be associated with osteomalacia or rickets.

Mild to moderate deficiency — 10–19
May be associated with increased risk of osteoporosis or secondary hyperparathyroidism.

Optimum levels — 20–50
Optimum levels in the healthy population; patients with bone disease may benefit from higher levels within this range.

Increased risk of hypercalciuria — 51–80
Sustained levels 25OH–VitD along with prolonged calcium supplementation may lead to hypercalciuria and decreased renal function.

Toxicity possible — > 80
High risk for toxic effects.

NOTE
- The assay measures both D2 (Ergocalciferol) and D3 (Cholecalciferol) metabolites of vitamin D.
- 25 (OH) D is influenced by sunlight, latitude, skin pigmentation, sunscreen use and hepatic function.
- Optimal calcium absorption requires vitamin D 25 (OH) levels exceeding 50 ng/mL.
- It shows seasonal variation, with values being 40–50% lower in winter than in summer.
- Levels vary with age and are increased in pregnancy.

DECREASED LEVELS
- Inadequate exposure to sunlight
- Dietary deficiency
- Vitamin D malabsorption
- Severe Hepatocellular disease
- Drugs like Anticonvulsants
- Nephrotic syndrome

INCREASED LEVELS
- Vitamin D intoxication

This is a clinical interpretation chart for vitamin D (25OH–VitD) levels, detailing deficiency, optimal ranges, and toxicity thresholds, along with influencing factors and associated conditions.`;

    // Vitamin D interpretation is loaded when the Vitamin D template is selected.


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
        if (typeof showToast === "function") showToast("BLSSNVJ21 installed");
    });

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register(new URL("./sw.js", document.baseURI), { scope: new URL("./", document.baseURI).pathname })
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

    migrateLegacyReportsOnce().then(async () => {
        const restored = await loadDraft();
        if (!restored) updateStorageStatus("Ready for a new report");
        await renderSavedReports();
    });
});