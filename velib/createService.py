#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from dbus.mainloop.glib import DBusGMainLoop
from gi.repository import GLib
import dbus
import dbus.service
import inspect
import pprint
import os
import sys
import getopt

softwareVersion = '1.0'

class Path:
    def __init__(self, name, typeName, value, description='', writeable=True):
        self.name = name
        self.typeName = typeName
        if self.typeName.lower() == 'num':
            self.value = float(value)
        else:
            self.value = str(value)
        self.description = description
        self.writeable = writeable

def validate_new_value(path, newvalue):
    # Max RPM setpoint = 1000
    return newvalue <= 1000

def get_text_for_rpm(path, value):
    return('%d rotations per minute' % value)

def main():
        velibPath = '';
        serviceName = 'com.victronenergy.example'
        opts, args = getopt.getopt(sys.argv[1:], 'v:s:p:', ['velibPath=','serviceName=','path='])

        paths = [];
        for opt, arg in opts:
            print('Opt:' + opt + ' Agr:' + arg)
            if opt in ('-v', '--velibPath'):
                velibPath = arg
            elif opt in ('-s', '--serviceName'):
                serviceName = arg
            elif opt in ('-p', '--path'):
                newPathArgs = arg.split(':')
                if len(newPathArgs) == 3:
                    paths.append(Path(newPathArgs[0], newPathArgs[1], newPathArgs[2]))
                elif len(newPathArgs) == 4:
                    paths.append(Path(newPathArgs[0], newPathArgs[1], newPathArgs[2], newPathArgs[3]))
                elif len(newPathArgs) == 5:
                    paths.append(Path(newPathArgs[0], newPathArgs[1], newPathArgs[2], newPathArgs[3], newPathArgs[4]))

        global dbusObjects
    
        # Victron packages
        if velibPath == '':
            sys.path.insert(1, os.path.join(os.path.dirname(__file__), '../'))
        else:
            sys.path.insert(1, velibPath)
        
        from vedbus import VeDbusService
        
        print(__file__ + " starting up")

        # Have a mainloop, so we can send/receive asynchronous calls to and from dbus
        DBusGMainLoop(set_as_default=True)

        # Put ourselves on to the dbus
        dbusservice = VeDbusService(serviceName)
        print(serviceName)

        for path in paths:
            dbusservice.add_path(path.name, value=path.value, description=str(path.description), writeable=path.writeable)
            print(path.name + ' value is %s' % dbusservice[path.name])

        mainloop = GLib.MainLoop()
        mainloop.run()

main()

