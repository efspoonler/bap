# Vulnerability Explorer

## installing the application

We assume that python3.x is already installed on the maschine.

1. clone the project

    ```bash
    git clone git@github.com:efspoonler/bap.git 
    ```

2. navigate into the projects root folder
3. Create a virtual environment

    ```bash
    pip install virtualenv
    python3 -m venv .venv
    source .venv/bin/activate
    ```

4. install the requirements from `requirements.txt`:

    ```bash
    pip install -r requirements.txt
    ```


5. install the node module
    - change directory

        ```bash
        cd app/static
        ```

    - install the modules (see package.json)

        ```bash
        npm install
        ```

## run the application

1. To perform this step, navigate to the root of the project, and activate the *virtual environment*.

2. execute

    ```bash
    run.py
    ```

3. Please visit the website returned by the server.

## crawling the data

Perform these steps when first using the application or if you want to update the database.

1. adjust the variables *eclipseSteadyURL* and *workspace(token)* in api/routes.py. the ecpiseSteadyURL should contain the root domain of the Eclipse Steady instance. If not yet installed, follow https://github.com/eclipse/steady/ . The workspace contains the workspace identifier, which is generated during the Eclipse Steady setup process.

2. make a request to \<rootdomain>/pickle/all/appdepvulas
  this will crawl the data from Eclipse Steady.

3. if Step 2 we rename the newly generated pickel file.

    ```bash
    cd static/pickleFiles
    mv picklefile_all_apps_with_deps_and_vulndeps_new picklefile_all_apps_with_deps_and_vulndeps
    ```

4. Suitable files are created by calling \<rootdomain>/data/create/files-for-visualization

5. (optional) - will be used in the future - creates the dependecy structure for each application. call \<rootdomain>/data/create/app-forest.
