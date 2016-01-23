var http = require('http'),
	lodash = require('lodash'),
	fs = require('fs'),
	request = require('request'),
	mkdirp = require('mkdirp');

const filterExtensions = ['png', 'jpg', 'gif', 'webm'];

const pathContainsExtension = path=> {
	return lodash(filterExtensions).filter(extension=> {
			return path.indexOf(extension) === path.length - extension.length;
		}).value().length > 0;
};

const dataDirectory = 'data/';

var cache = [];

const existsInCache = (uri)=> {
	return lodash(cache).indexOf(uri) !== -1;
};

const addToCache = (uri)=> {
	cache.push(uri);
};

var download = function (uri, filename, callback) {
	try {
		request.head(uri, function (err, res, body) {
			if (err) return;
			//console.log('content-type:', res.headers['content-type']);
			//console.log('content-length:', res.headers['content-length']);
			request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
		});
	} catch (e) {
		console.log(e);
	}
};

var server = http.createServer(function (req, res) {
	try {
		var proxy_request = http.request({
			port: 80,
			host: req.headers['host'],
			method: req.method,
			path: req.url,
			headers: req.headers
		});

		if (pathContainsExtension(req.url) && !existsInCache(req.url)) {
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

			addToCache(req.url);

			const fileName = directories.splice(-1, 1)[0];
			directories = directories.splice(0, directories.length);

			const directoryPath = dataDirectory + directories.join('/');
			console.log(directoryPath + '/' + fileName);
			mkdirp(directoryPath);

			download(req.url, directoryPath + '/' + fileName, ()=> {
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
		proxy_request.addListener('error', () => {
		});

		req.addListener('data', function (chunk) {
			proxy_request.write(chunk, 'binary');
		});
		req.addListener('end', function () {
			proxy_request.end();
		});
		req.addListener('error', () => {
		});
	} catch (e) {
		console.log(e);
	}
}).listen(8080);

server.on('error', (e)=> {
	console.log(e);
});