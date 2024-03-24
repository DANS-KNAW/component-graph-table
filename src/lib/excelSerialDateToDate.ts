/**
 * Converts an Excel serial date to a formatted date string (yyyy-mm-dd).
 *
 * @param serialDate - The Excel serial date to convert.
 * @returns The formatted date string in the format yyyy-mm-dd.
 */
function excelSerialDateToDate(serialDate: number): string {
    // Excel's epoch starts on 1899-12-31
    const excelEpoch = new Date(Date.UTC(1899, 11, 31));
    // Add the serial date. Note: Excel incorrectly treats 1900 as a leap year
    let correctSerialDate = serialDate;
    if (serialDate > 59) {
        // Adjust for the fact that Excel's leap year bug means 1900 is treated as a leap year
        correctSerialDate -= 1;
    }
    const resultDate = new Date(excelEpoch.getTime() + correctSerialDate * 86400000); // 86400000ms per day
    // Format the date as yyyy-mm-dd
    const yyyy = resultDate.getUTCFullYear();
    // getUTCMonth() returns month from 0-11; need to add 1 for correct month
    const mm = (resultDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = resultDate.getUTCDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default excelSerialDateToDate;