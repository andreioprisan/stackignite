### What is StackIgnite?

In short, it's a real-time cost monitoring solution for AWS. Instances and prices get monitored in real-time, enabling more detailed 
Some of the features that this application provides are spot instance price tracking, normalizing by hour and calculating costs.

### How to run the application

To get started,
```
1. update helpers/auth.js with your Mongo and AWS credentials
2. run 'npm install' to install all required node packages
3. run 'node server.js'
```

Alternatively, you can 
```
1. use a load-balanced solution with haproxy (see scripts/haproxy.cfg for an example) and 
2. bring up a number of node instances using 'forever' (install with 'npm install -g forever')
```

### Authors and Contributors
Copyright 2013 Andrei Oprisan. Licensed under the MIT license.