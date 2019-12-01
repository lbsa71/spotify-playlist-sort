import SpotifyWebApi from 'spotify-web-api-node'
import WebInteract from 'web-auth'
import debug from 'debug'

const err = debug('main')

const scopes = [
  'playlist-read-private',
  'playlist-modify-private'
]

const port = 3000

const redirectUri = "http://localhost:" + port + "/callback"

const clientId = '9c1acea281934003882bb7bd51566000'
const clientSecret = 'cc60b02cc9f54c15bdc6d9dbf1caea44'
const state = "some_state"

var spotifyApi = new SpotifyWebApi({
  redirectUri,
  clientId,
  clientSecret
});

// Create the authorization URL
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state) //+"&show_dialog=true"

var interact = WebInteract(authorizeURL, port)

const infos=[]

interact.then(req => {
  const {
    code
  } = req.query;

  err("code: %o", code)

  spotifyApi.authorizationCodeGrant(code).then(data => {
    err("data: %o", data)

    const {
      access_token,
      refresh_token
    } = data.body;

    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    spotifyApi.getPlaylist('3z896C4DHAyHvJo4b05rmE')
      .then(function(data) {

        const promises = []

        const playlist = data.body

        err('playlist: %o', playlist);

        const entries = playlist.tracks

        //  err('entries: %o', entries);

        const items = entries.items

        err('# of entries: %o', items.length);

        for (var i = 0; i < items.length; i++) {
          promises.push(new Promise((resolve, reject) => {

            const item = items[i]

            // err('Item: %o', item);

            const track = item.track

            if (track) {
              const id = track.id
              const name = track.name
              const artists = track.artists

              spotifyApi.getAudioFeaturesForTrack(id)
                .then(function(data) {
                  const features = data.body

                  const tempo = features.tempo

                  var normalized_tempo = tempo

                  while (normalized_tempo >= 1) normalized_tempo /= 2

                  const key = features.key

                  const info = {
                    tempo,
                    normalized_tempo,
                    key,
                    name,
                    artists: artists.map(a => a.name).join("/")
                  }

                  infos.push(info)
                  resolve(info)
                }, function(err) {
                  err(err);
                });
            } else {
              resolve()
            }
          }))
        }

        Promise.all(promises).then(() =>{
          err("infos: %o", infos.length)
          process.exit()
        })
      }, function(err) {
        console.log('Something went wrong!', err);
      })
  }).catch(e => {
    err("meh, %o", e)
  })
})
