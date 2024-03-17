const ENCODING_BITS = 16;
const CAESAR_ZERO_COUNT = 'a';
const CAESAR_DIVERSION = 3;

/**
 * @return {string}
 */
function PadLeft(input, count, char) {
    let paddedString = input + '';
    while (paddedString.length < count)
        paddedString = char + paddedString;
    return paddedString;
}

/**
 * @return {string}
 */
function ReverseString(str)
{
    let result = "";
    for (let i = str.length - 1; i >= 0; i--)
    {
        result += str[i];
    }
    return result;
}

/**
 * @return {string}
 */
function IntToBinary(num, digits)
{
    let result = "";
    let tmp = num;
    if (num <= 0)
        return "0";
    while(tmp > 0) {
        result += ((tmp % 2) === 0) ? "0" : "1";
        tmp = parseInt(tmp / 2, 10);
    }
    return PadLeft(ReverseString(result), digits, '0');
}

/**
 * @return {string}
 */
function CharToBinary(c, digitsCount)
{
    if (c && c.length > 0) {
        const decValue = c.charCodeAt(0);
        return IntToBinary(decValue, digitsCount);
    }
    return '';
}

/**
 * @return {string}
 */
function Scramble(str)
{
    let result = "";
    for (let i = 0; i < str.length; i++)
    {
        // String.fromCharCode
        result += str[(i + CAESAR_DIVERSION) % str.length];
    }
    return result;
}

/**
 * @return {string}
 */
function Encode(rawValue) {
    if (rawValue == null || rawValue.length === 0) {
        return "";
    }
    let result;
    let arrBinChars = [""];
    let curPart = "";
    let minZeroCount = ENCODING_BITS;
    for (let i = 0; i < rawValue.length; i++) {
        arrBinChars.push(CharToBinary(rawValue[i], ENCODING_BITS));
    }
    for (let i = 1; i < arrBinChars.length; i++)
    {
        curPart = arrBinChars[i];
        let curZeroCount = 0;
        let j = 0;
        while (j < curPart.length && curPart[j] === '0')
        {
            curZeroCount++;
            j += 1;
        }
        if (curZeroCount < minZeroCount)
            minZeroCount = curZeroCount;
    }

    arrBinChars[0] = "";
    if (minZeroCount < ENCODING_BITS)
    {
        arrBinChars[0] = String.fromCharCode(CAESAR_ZERO_COUNT.charCodeAt(0) + minZeroCount);
        for (let i = 1; i < arrBinChars.length; i++)
        {
            arrBinChars[i] = arrBinChars[i].substring(minZeroCount);
            arrBinChars[i] = Scramble(arrBinChars[i]);
        }
    }

    result = arrBinChars.join("");
    return result;
}

function Decode(rawValue) {

}

module.exports.Encode = Encode;
module.exports.Decode = Decode;