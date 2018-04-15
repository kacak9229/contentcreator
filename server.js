const request = require('request');
const cheerio = require('cheerio');
const util = require('util');
const http = require('http');
const express = require('express');
// const cronJob = require('cron').CronJob;
const mongoose = require('mongoose');
const async = require('async');
const axios = require('axios');

const Category = require('./models/Category');
const JavLink = require('./models/JavLink');
const Video = require('./models/Video');
const app = express();

const config = require('./config');

const db = mongoose.connection;

mongoose.connect(config.MONGODB_URI, (err) => {
  if (err) {
    console.log("Error connected");
  } else {
    console.log("Connected to the database")
  }
});

db.on('connecting', function() {
  console.log('connecting to MongoDB...');
});

db.on('error', function(error) {
  console.error('Error in MongoDb connection: ' + error);
  mongoose.disconnect();
});

db.on('connected', function() {
  console.log('MongoDB connected!');
});

function extractPage(url) {
  const first = url.substr(url.indexOf('&page='))
  const second = first.substr((first.indexOf('=') + 1))

  if (second.search('&') >= 0) {
    return second.substr(0, second.indexOf('&'))
  }
  return second
}


/* Scrape the total number of videos  Scraper One*/
function ScrapeCategory() {
  request('http://www.javlibrary.com/en/genres.php', function(error, response, body) {
    var $ = cheerio.load(body, { ignoreWhitespace: true, xmlMode: true });
    $('div.textbox > .genreitem').each(function(i, value) {
      // console.log(value);
      if ($($('div.textbox > .genreitem')[i]).text() === 'Gay') {

      } else {
        let categoryName = $($('div.textbox > .genreitem')[i]).text();
        let link = $($('div.textbox > .genreitem a')[i]).attr('href');
        link = link.substring(15);
        let totalVideos = $('a.last').attr('href');

        let category = new Category();
        category.name = categoryName;
        category.link = link;
        category.number = i

        console.log(category);
        category.save();
      }

    });
    console.log('Finished the task awesome')
  });
}

/* Scrape the total number of pages per category  Scraper two*/
function ScrapeTotalNumberOfPageOnEachCategory() {
  async.waterfall([
    function(callback) {
      Category.find({}, (err, categories) => {
        if (categories) {
          callback(err, categories);
        }
      });
    },
    function(categories, callback) {
      categories.map(async (category) => {
        var baseUrl = `http://www.javlibrary.com/en/vl_genre.php?&mode=&g=${category.link}&page=${1}`;

        try {
          const response = await axios.get(baseUrl)
          var $ = cheerio.load(response.data, { ignoreWhitespace: true, xmlMode: true });

          var totalVideosPerPage = $('a.last').attr('href');
          let link = $($('div.video > a')[1]).attr('href');
          if (totalVideosPerPage !== undefined && link !== undefined) {
            Category.findOne({ link: category.link }, (err, foundCategory) => {
              foundCategory.totalPage = extractPage(totalVideosPerPage);
              foundCategory.save();
              console.log(extractPage(totalVideosPerPage));
            });
          }
        } catch(err) {
          console.log(err)
        }
      });
      console.log("Completed");
    }
  ])
}

/* Scraper Number 3 by Category */
function ScrapeLinkByCategoryName(categoryName) {
  async.waterfall([
    function(callback) {
      Category.findOne({ name: categoryName }, (err, category) => {
        if (category) {
          callback(err, category);
        }
      });
    },
    function(category, callback) {
      console.log(category);
      for (let PAGE = 1; PAGE <= category.totalPage; PAGE++) {
        console.log(PAGE);
        let baseUrl = `http://www.javlibrary.com/en/vl_genre.php?&mode=&g=${category.link}&page=${PAGE}`;
        axios.get(baseUrl)
        .then(response => {
          if (response.data === undefined) {

          }
          console.log(baseUrl);
          let $ = cheerio.load(response.data, { ignoreWhitespace: true, xmlMode: true });
          $('div.videos > .video').each(function(i, value) {
            console.log(i);
            let link = $($('div.videos > .video > a')[1]).attr('href');
            link = link.substring(1);
            javId = $($('div.video > a > .id')[i]).text()

            JavLink.findOne({ jav_id: javId }, (err, foundLink) => {
              if (!foundLink) {
                let javlink = new JavLink();
                javlink.link = link;
                javlink.jav_id = javId;
                javlink.save((err) => {
                  console.log(link);
                  console.log(javId);
                });

              }
            });
          });
        }).catch(err => {
          console.log(err);
        })
      }
    }

  ])

}

/* Scraper number 4: Scraper a single link */
function singleContentCreator(link) {
  let baseUrl = `http://www.javlibrary.com/en${link}`;
  axios.get(baseUrl).then(response => {
    let $ = cheerio.load(response.data, { ignoreWhitespace: true, xmlMode: true });

    let title = $('#video_title .post-title.text').text();
    let image = $('#video_jacket_img').attr('src');
    let jav_id = $('#video_id td.text').text();
    let release_date = $('#video_date td.text').text();
    let director = $('#video_director td.text .director a').text();
    let maker = $('#video_maker td.text .maker a').text();
    let video_length = $('#video_length span.text').text();
    let genres = $('#video_genres td.text .genre');
    let casts = $('#video_cast td.text .cast .star');

    console.log(`The title: ${title}`);
    console.log(`The Image: ${image}`); // image
    console.log(`The Jav ID: ${jav_id}`); // jav_id
    console.log(`The release date: ${release_date}`); // release_date
    console.log(`The director ${director}`); // Director
    console.log(`The maker: ${maker}`); // The title
    console.log(`The Video length: ${video_length}`);

    Video.findOne({ jav_id: jav_id }, (err, video) => {
      if (!video) {

        let video = new Video();
        video.title = (title) ? title: '----';
        video.jav_id = (jav_id) ? jav_id: '----';
        video.release_date = (release_date) ? new Date(release_date).toUTCString() : '----';
        video.director = (director) ? director : '----';
        video.maker = (maker) ? maker : '----';
        video.length = (video_length) ? video_length: 0;
        video.image = (image) ? `http:${image}`: '----';
        casts.each((i, elm) => {
          let cast = $(casts[i]).text();
          video.casts.push(cast);
        });

        video.save();

        genres.each((i, elm) => {
          let cat = $(genres[i]).text();
          async.waterfall([
            function(callback) {
              Category.findOne({ name: cat}, (err, category) => {
                if (category) {
                  callback(err, category);
                }
              });
            },
            function(category, callback) {
              Video.update(
                {
                  _id: video._id,
                  'genres': { $ne: category._id }
                },
                {
                  $push: { genres: category._id },
                }, function(err, count) {
                  if (err) {
                    console.log("Duplication 1")

                  }

                });
              }
            ]);
          });

            let javDate = new Date(release_date);
            let todayDate = new Date();
            javDate.setHours(0,0,0,0);
            todayDate.setHours(0,0,0,0);
            /* Will check the date first */
            if ((javDate.getTime() > todayDate.getTime()) || (javDate.getTime() === todayDate.getTime())) {

              Video.update(
                {
                  _id: video._id,
                },
                {
                  $set: { future_release:  true }
                }, function(err, count) {
                  if (err) {
                    console.log("Duplication 1.5")

                  }

                });

                console.log('Completed')
                // If the date is greater or equal then save the video
              } else {

                let avGleUrl = `https://api.avgle.com/v1/jav/${jav_id}/0`;
                axios.get(avGleUrl).then(response => {
                  const res = response.data.response;

                  if (res.videos.length > 0) {
                    async.parallel([
                      function(callback) {
                        Video.update(
                          {
                            _id: video._id,
                            'video_sources': { $ne: res.videos[0].embedded_url }
                          },
                          {
                            $push: { video_sources: res.videos[0].embedded_url },
                            $set: { preview_url:  res.videos[0].preview_video_url }
                          }, function(err, count) {
                            if (err) {
                              console.log("Duplication video");
                              callback(err)
                            }
                          });
                        },
                        function(callback) {
                          Video.update(
                            {
                              _id: video._id,
                              'preview_url': { $ne: res.videos[0].preview_video_url }
                            },
                            {

                              $set: { preview_url:  res.videos[0].preview_video_url }
                            }, function(err, count) {
                              if (err) {
                                console.log("Duplication preview");

                              }
                            });
                          }
                        ])
                      }
                      //  else {
                      //
                      //   video.future_release = true;
                      //   video.save();
                      //
                      // }

                    });
                  }
                }


              })


            }).catch(err => {
              if (err) {
                console.log(err);
              }
            })
          }

          // const a = [1,2,3,4,5,6,7,8,9,10]

          /* The master content creator of scraper */
function contentCreator() {

  JavLink.find({}, (err, javlinks) => {
    runTheJavLinks(javlinks);
  });

}

function setTimeoutPromise(fn, duration) {
  return new Promise(resolve => {
    setTimeout(() => {
      fn()
      resolve()
    }, duration)
  })
}


async function runTheJavLinks(javlink) {
  for(let i=0; i < javlink.length; i++) {
    await setTimeoutPromise(() => {
      singleContentCreator(javlink[i].link)
    }, 1000)
  }
}

contentCreator();

app.listen(3030, (err) => {
  console.log("Running on port 3030");
});
