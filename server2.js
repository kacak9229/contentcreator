var data = new Array();

new cronJob('*/15 * * * * *', function(){

  request('http://http://www.javlibrary.com/en/genres.php', function(error, response, body) {
    var $ = cheerio.load(body, { ignoreWhitespace: true, xmlMode: true });

    console.log($)

    $('id').each(function(i, html) {
      var cells = $(html).find('td');
      var price = $(cells[1]).text().trim().replace(/\/rd/g,'');
      var seller = $(cells[4]).text().trim().replace(/\[+(.*?)\]+/g,'$1');
      var description = $(cells[0]).text().trim()
      if (price != "") {
        var obj={}
        obj[seller] = [price, description]
        data.push(obj)
      };
    });
  });
}, null, true, "America/Los_Angeles");

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write(JSON.stringify(data))
  res.end();
}).listen(8000);

  util.puts('> gunbot scraper running on port 8000');
