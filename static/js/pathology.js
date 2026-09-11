"use strict";


/* =========================================================
   PATHOLOGY REPORT CREATOR

   FEATURES:
   - No database
   - No localStorage
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

                <button
                    type="button"
                    class="remove-section-btn"
                    title="Remove section"
                >
                    ×
                </button>

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

                <button
                    type="button"
                    class="remove-investigation-btn"
                    title="Remove test"
                >
                    ×
                </button>

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

    function resetForm() {


        const confirmed =
            window.confirm(
                "Clear the complete pathology report?"
            );


        if (!confirmed) {
            return;
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
            today
                .toISOString()
                .split("T")[0];


        document.getElementById(
            "reportDate"
        ).value =
            dateString;


        sectionsEditor.innerHTML =
            "";


        addSection();


        generateReport();

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


        resetForm();

    }


    /* =====================================================
       PRINT
    ====================================================== */

    function printReport() {

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

    addSectionBtn.addEventListener(
        "click",
        () => {

            addSection();

            generateReport();

        }
    );


    cbcTemplateBtn.addEventListener(
        "click",
        loadCBCTemplate
    );


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


    /* =====================================================
       INITIALIZATION
    ====================================================== */

    const today =
        new Date();


    const dateString =
        today
            .toISOString()
            .split("T")[0];


    document.getElementById(
        "reportDate"
    ).value =
        dateString;


    addSection();


    generateReport();

});