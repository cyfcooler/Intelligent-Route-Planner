# Intelligent-Route-Planner
Intelligent Route Planner: provide the smartest way for your travelling.

Setup your dev environment in 5 minutes:

Prerequisite:
1. Install nodejs: https://nodejs.org/download/
2. After installation, add path of node.exe (e.g. C:\Program Files\nodejs in Windows) into your environment variable PATH
3. Install mongodb: http://www.mongodb.org/downloads
4. After installation, add path of mongod.exe (e.g. C:\Program Files\MongoDB\Server\3.0\bin in Windows) into your environment variable PATH
5. Run "npm install mongodb" in cmd console. NOTE: If your OS is Windows and installs Visual Studio 2010/2012/2013, then you need add option "-msvs_version=2010/2012/2013" or add a new environment variable "GYP_MSVS_VERSION=2010/2012/2013" when run this step.

Run in console:
1. Git clone https://github.com/cyfcooler/Intelligent-Route-Planner.git to your GitHub folder.
2. Extract mongo_20150410.zip under database folder into one place (e.g. C:\new_database)
3. Run "mongod --dbpath=C:\new_database" in cmd console(C:\new_database is your extracted folder in previous step). This will start a mongodb daemon service in your computer.
4. Go to Intelligent-Route-Planner\source under your GitHub folder, and run "node runInConsole.js". If you saw following message:

		please provide arguments in following order:
		required: [date] [from] [to] [preference]
		optional: [max_solutions] [consider_transfer] [min_wait_time] [max_wait_time] [same_station_transfer] [max_duration] [max_price] [start_time_range] [end_time_range] [required_seat_type] [required_ticket_num]
		
	Then you're close to victory :-)
5. Start a sample run like "node runInConsole.js 2015-04-30 BJP SHH time", and if you saw the result, then it means your environment is complete. (BJP and SHH is the station code, which can be found in Intelligent-Route-Planner\source\crawler\train\data\station.js)

Run in Http server:
1. Go to Intelligent-Route-Planner\source\express under your GitHub folder, and run "npm start". It will start a Http server, and you can saw message from console like this:

		> express@0.0.0 start C:\Users\yifche\Documents\GitHub\Intelligent-Route-Planner\source\express
		> node ./bin/www
		
2. Open your browser, and visit http://localhost:3000/. You can see a web page, and can query train here.

Run crawler:
Currently the crawler is written by node.js. You can see the whole process in Intelligent-Route-Planner\source\crawler\train\readme.txt. Sample run is like: node getStation.js XXXX (XXXX is 验证码 from https://kyfw.12306.cn/otn/czxx/init). NOTE: you should also change the Cookie in getStation.js file, which can be gotten by Fiddler :-)