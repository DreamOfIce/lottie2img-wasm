#include "utils.h"

using namespace std;

string convertVersion(int version)
{
  uint8_t major = (version >> 16) & 0xFF;
  uint8_t minor = (version >> 8) & 0xFF;
  uint8_t patch = version & 0xFF;
  return to_string(major) + '.' + to_string(minor) + '.' + std::to_string(patch);
}

bool isGzip(uint8_t *input, size_t inputLength)
{
  return inputLength > 2 && input[0] == 0x1F && input[1] == 0x8B;
}

string decompressGzip(uint8_t *input, size_t inputLength)
{
  string result;
  const size_t bufferLength = inputLength * 2 < 131072l ? 131072l : inputLength * 2; // min buufer size 128k
  std::unique_ptr<uint8_t> buffer(new uint8_t[bufferLength]);

  z_stream zs;
  zs.zalloc = Z_NULL;
  zs.zfree = Z_NULL;
  zs.opaque = Z_NULL;
  zs.next_in = input;
  zs.avail_in = inputLength;
  zs.next_out = buffer.get();
  zs.avail_out = bufferLength;

  inflateInit2(&zs, MAX_WBITS | 16); // enable gzip

  // decompress
  int code;
  do
  {
    code = inflate(&zs, Z_NO_FLUSH);
    if (code != Z_OK && code != Z_STREAM_END)
    {
      cerr << "Could not decompress the lottie file: " << zs.msg << '(' << code << ")." << endl;
      throw runtime_error("zlib failed with " + string(zs.msg));
    }
    result += string((char *)buffer.get(), bufferLength - zs.avail_out);
    zs.next_out = buffer.get();
    zs.avail_out = bufferLength;
  } while (code != Z_STREAM_END);

  inflateEnd(&zs);
  return result;
}

renderOptions parseArg(string argstr)
{
  renderOptions options;
  int pos = argstr.find(";", 0);
  while (pos != string::npos)
  {
    string arg = argstr.substr(0, pos);
    int pos = arg.find('=');
    if (pos == string::npos)
    {
      throw "Bad argument: " + arg;
    }
    string key = arg.substr(0, pos - 1);
    string value = arg.substr(pos);
    argstr.erase(0, pos + 1);
    cout << key << ":" << value << endl;
    if (key == "format")
    {
      options.format = value;
    }
    else if (key == "frameRate")
    {
      options.frameRate = stod(value);
    }
    else if (key == "height")
    {
      options.height = stoi(value);
    }
    else if (key == "width")
    {
      options.width = stoi(value);
    }
    else if (key == "loop")
    {
      options.loop = stoi(value);
    }
    else if (key == "minimizeSize")
    {
      options.minimizeSize = value == "true";
    }
    else if (key == "backgroundColor")
    {
      options.backgroundColor = stoul(value);
    }
    else if (key == "quality")
    {
      options.quality = stof(value);
    }
    else if (key == "level")
    {
      options.level = stoi(value);
    }
    else
    {
      cerr << "[Warning] Unknow argument: " << arg << ", ignored." << endl;
    }
    argstr.find(";", pos);
  }
  return options;
}
