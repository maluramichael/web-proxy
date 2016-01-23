var http = require('http'),
	lodash = require('lodash'),
	mkdirp = require('mkdirp');

const filterExtensions = ['png', 'jpg', 'gif'];

const pathContainsExtension = path=> {
	return lodash(filterExtensions).filter(extension=> {
			return path.indexOf(extension) === path.length - extension.length;
		}).value().length > 0;
};

http.createServer(function (request, response) {
	// var proxy = http.createClient(80, request.headers['host'])
	// var proxy_request = proxy.request(request.method, request.url, request.headers);
	var proxy_request = http.request({
		port: 80,
		host: request.headers['host'],
		method: request.method,
		path: request.url,
		headers: request.headers
	});

	console.log(`[${request.method}] ${request.url} ${pathContainsExtension(request.url)}`);

	proxy_request.addListener('response', function (proxy_response) {
		proxy_response.addListener('data', function (chunk) {
			response.write(chunk, 'binary');
		});
		proxy_response.addListener('end', function () {
			response.end();
		});
		response.writeHead(proxy_response.statusCode, proxy_response.headers);
	});
	request.addListener('data', function (chunk) {
		proxy_request.write(chunk, 'binary');
	});
	request.addListener('end', function () {
		proxy_request.end();
	});
}).listen(8080);
