/**
 * Grade Conversions
 * The numeric value of the mappings is the V value of the climb, assuming consistent exponential scaling.
 */

const GradingSystem = {
    V_SCALE: "V Scale",
    FONT_SCALE: "Font Scale"
}

const V_GRADES = {
    V0: 0,
    V1: 1,
    V2: 2,
    V3: 3,
    V4: 4,
    V5: 5,
    V6: 6,
    V7: 7,
    V8: 8,
    V9: 9,
    V10: 10,
    V11: 11,
    V12: 12,
    V13: 13,
    V14: 14,
    V15: 15,
    V16: 16,
    V17: 17,
}
const GRADE_TO_V = {}
for (let [v, grade] of Object.entries(V_GRADES)) {
    GRADE_TO_V[grade] = v
}

const FONT_GRADES = {
    "4": 0,
    "5": 1,
    "5+": 2,
    "6A": 3,
    "6A+": 3.5,
    "6B": 4,
    "6B+": 4.5,
    "6C": 5,
    "6C+": 5.75,
    "7A": 6.5,
    "7A+": 7.25,
    "7B": 8,
    "7B+": 8.75,
    "7C": 9.5,
    "7C+": 10.25,
    "8A": 11,
    "8A+": 12,
    "8B": 13,
    "8B+": 14,
    "8C": 15,
    "8C+": 16,
    "9A": 17,
}
const GRADE_TO_FONT = {}
for (let [fontGrade, grade] of Object.entries(FONT_GRADES)) {
    GRADE_TO_FONT[grade] = fontGrade
    if (GRADE_TO_FONT[Math.floor(grade)] == null) {
        GRADE_TO_FONT[Math.floor(grade)] = fontGrade
    }
}

function gradeToFont(grade) {
    let accurateFontGrade = GRADE_TO_FONT[grade]
    if (accurateFontGrade == null) {
        return GRADE_TO_FONT[Math.floor(grade)]
    }
    return accurateFontGrade
}

function gradeToV(grade) {
    return GRADE_TO_V[Math.floor(grade)]
}

export {V_GRADES, FONT_GRADES, gradeToFont, gradeToV, GradingSystem}
