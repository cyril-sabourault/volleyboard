# README

## Usage

Connect to the VM instance and start the http server by running the following commands:

```shell
gcloud compute ssh cyril_sabourault@gemini-cli --zone=europe-west1-c --tunnel-through-iap
python3 -m http.server 8080 > /dev/null 2>&1 &
```

On host computer, run the following command to create an SSH tunnel to the Gemini CLI server:

```shell
gcloud compute ssh gemini-cli --zone=europe-west1-c --tunnel-through-iap -- -4 -NL 8080:localhost:8080
```

Then, open a web browser and navigate to `http://localhost:8080` to access the Volleyboard application.

## TODO

- Add alt shortcut to duplicate an object
- can't see color palette on mobile
- deploy new version on github page
