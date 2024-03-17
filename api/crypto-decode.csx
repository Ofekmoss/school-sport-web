using System;
using System.Threading.Tasks;

public class Startup
{
    public async Task<object> Invoke(object input)
    {
        string v = input == null ? "" : (string)input;
        return Crypto.Decode(v);
    }
}

static class Crypto
{
    private static int ENCODING_BITS=16;
    private static char CAESAR_ZERO_COUNT='a';
    private static int CAESAR_DIVERSION=3;

    public static string Decode(string str)
    {
        string result="";
        string curBinary;
        char curChar;
        int minZeroCount=0;
        int i;

        if ((str.Length > 0)&&((int)str[0] > (int)CAESAR_ZERO_COUNT))
        minZeroCount = ((int)str[0])-((int)CAESAR_ZERO_COUNT);

        if (minZeroCount >= ENCODING_BITS)
            throw new Exception("decoding failed: invalid string: "+str);

        for (i=1; i<str.Length; i+=(ENCODING_BITS-minZeroCount))
        {
            curBinary = str.Substring(i, ENCODING_BITS-minZeroCount);
            curBinary = UnScramble(curBinary);
            curChar = BinaryToChar(curBinary);
            result += curChar.ToString();
        }

        return result;
    }

    private static char BinaryToChar(string strBinary)
    {
        int decValue=BinaryToInt(strBinary);
        return (char)decValue;
    }

    private static string UnScramble(string str)
    {
        string result="";
        for (int i=0; i<str.Length; i++)
        {
            result += str[(i+str.Length-CAESAR_DIVERSION)%str.Length].ToString();
        }
        return result;
    }

    private static int MyPower(int num, int power)
    {
        if (power <= 0)
            return 1;
        return num*MyPower(num, power-1);
    }

    private static int BinaryToInt(string strBinary)
    {
        int result=0;
        for (int i=0; i<strBinary.Length; i++)
        {
            if (strBinary[i] == '1')
                result += MyPower(2, (strBinary.Length-i-1));
        }
        return result;
    }
}