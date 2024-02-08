import os
from flaskapi import run_dev_server
from concurrent.futures import ThreadPoolExecutor

if __name__ == "__main__":
    # run the flask api in a separate thread
    with ThreadPoolExecutor(max_workers=1) as executor:
        executor.submit(run_dev_server)

    # then run the react app in ./scheduling using yarn dev
    os.system("cd scheduling && yarn && yarn dev")
