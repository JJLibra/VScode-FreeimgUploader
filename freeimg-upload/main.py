import http.client
import mimetypes
from codecs import encode
import json

conn = http.client.HTTPSConnection("www.freeimg.cn")
dataList = []
boundary = 'wL36Yn8afVp8Ag7AmP8qZ0SA4n1v9T'
dataList.append(encode('--' + boundary))
dataList.append(encode('Content-Disposition: form-data; name=file; filename={0}'.format('D:\Tools\MyWebsite\images\文章cover\Freeimg.png')))

fileType = mimetypes.guess_type('D:\Tools\MyWebsite\images\文章cover\Freeimg.png')[0] or 'application/octet-stream'
dataList.append(encode('Content-Type: {}'.format(fileType)))
dataList.append(encode(''))

with open('D:\Tools\MyWebsite\images\文章cover\Freeimg.png', 'rb') as f:
   dataList.append(f.read())
dataList.append(encode('--'+boundary+'--'))
dataList.append(encode(''))
body = b'\r\n'.join(dataList)
payload = body
headers = {
   'Accept': 'form-data',
   'Authorization': '',
   'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
   'Content-type': 'multipart/form-data; boundary={}'.format(boundary)
}
conn.request("POST", "/api/v1/upload", payload, headers)
res = conn.getresponse()
data = res.read()
# print(data.decode("utf-8"))

response_data = json.loads(data.decode("utf-8"))
formatted_response = json.dumps(response_data, indent=4, ensure_ascii=False)
print(formatted_response)