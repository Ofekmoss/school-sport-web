using System;
using System.Threading.Tasks;

public class Startup
{
    public async Task<object> Invoke(object input)
    {
        string v = input == null ? "" : (string)input;
        return Crypto.Encode(v);
    }
}

static class Crypto
{
    private static int ENCODING_BITS=16;
    private static char CAESAR_ZERO_COUNT='a';
    private static int CAESAR_DIVERSION=3;

    public static string Encode(string str)
    {
        string result="";
        string[] arrBinChars=new string[str.Length+1];
        string curPart;
        int minZeroCount=ENCODING_BITS;
        int i;

        for (i=0; i<str.Length; i++)
            arrBinChars[i+1] = CharToBinary(str[i], ENCODING_BITS);

        for (i=1; i<arrBinChars.Length; i++)
        {
            curPart = arrBinChars[i];
            int curZeroCount=0, j=0;
            while ((j < curPart.Length)&&(curPart[j] == '0'))
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
            arrBinChars[0] = ((char)(((int)CAESAR_ZERO_COUNT)+minZeroCount)).ToString();
            for (i=1; i<arrBinChars.Length; i++)
            {
                arrBinChars[i] = arrBinChars[i].Substring(minZeroCount);
                arrBinChars[i] = Scramble(arrBinChars[i]);
            }
        }

        result = String.Join("", arrBinChars);
        return result;
    }

    private static string CharToBinary(char c, int digitsCount)
    {
        int decValue=(int)c;
        return IntToBinary(decValue, digitsCount);
    }

    private static string Scramble(string str)
    {
        string result="";
        for (int i=0; i<str.Length; i++)
        {
            result += str[(i+CAESAR_DIVERSION)%str.Length].ToString();
        }
        return result;
    }

    private static string IntToBinary(int num, int digits)
    {
        string result="";
        int tmp=num;
        if (num <= 0)
            return "0";
        while(tmp > 0)
        {
            result += ((tmp % 2)==0)?"0":"1";
            tmp /= 2;
        }
        return ReverseString(result).PadLeft(digits, '0');
    }

    private static string ReverseString(string str)
    {
        string result="";
        for (int i=str.Length-1; i>=0; i--)
        {
            result += str[i].ToString();
        }
        return result;
    }
}