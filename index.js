var http = require('http'),
	lodash = require('lodash'),
	fs = require('fs'),
	request = require('request'),
	mkdirp = require('mkdirp');

const filterExtensions = ['png', 'jpg', 'gif'];

const pathContainsExtension = path=> {
	return lodash(filterExtensions).filter(extension=> {
			return path.indexOf(extension) === path.length - extension.length;
		}).value().length > 0;
};

const dataDirectory = 'data/';

var download = function (uri, filename, callback) {
	request.head(uri, function (err, res, body) {
		console.log('content-type:', res.headers['content-type']);
		console.log('content-length:', res.headers['content-length']);

		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

var downloadQueue = [];

http.createServer(function (req, res) {
	// var proxy = http.createClient(80, request.headers['host'])
	// var proxy_request = proxy.request(request.method, request.url, request.headers);
	var proxy_request = http.request({
		port: 80,
		host: req.headers['host'],
		method: req.method,
		path: req.url,
		headers: req.headers
	});

	if (pathContainsExtension(req.url)) {
		var directories = req.url.split('/');
		directories = lodash(directories).filter(e=> {
			switch (e) {
				case '':
				case 'http:':
				case 'https:':
				case 'www':
					return false;
				default:
					return true;
			}
		}).value();

		const fileName = directories.splice(-1, 1);
		directories = directories.splice(0, directories.length - 1);

		const directoryPath = dataDirectory + directories.join('/');
		mkdirp(directoryPath);

		download(req.url, directoryPath + '/' + fileName, ()=> {
			console.log('done', req.url)
		});

		//console.log(`[${request.method}] ${request.url} ${directories}`);
	}
	proxy_request.addListener('response', function (proxy_response) {
		proxy_response.addListener('data', function (chunk) {
			res.write(chunk, 'binary');
		});
		proxy_response.addListener('end', function () {
			res.end();
		});
		res.writeHead(proxy_response.statusCode, proxy_response.headers);
	});
	req.addListener('data', function (chunk) {
		proxy_request.write(chunk, 'binary');
	});
	req.addListener('end', function () {
		proxy_request.end();
	});
}).listen(8080);
