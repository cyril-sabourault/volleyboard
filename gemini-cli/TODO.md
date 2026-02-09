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
- add hover on pc and long press on mobile for shortcut (insert a setter, insert a dotted line)
- enter full screen mode, or make the court fit -width
- rotate the court...
- on screens too small, the collapse toolbar button is detached from the toolbar 

