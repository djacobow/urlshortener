## Synopsis

us_server.js is a very simple link-shortening server.

## Motivation

My organization needed a its own link-shortener that it could curate.
The problem seemed to trivial to justify licensing commercial solutions.

## Installation

1. Install mysql somewhere
2. create the necessary users and database
3. Edit lib/config.js as required
4. node lib/urldb.js (creates tables)
5. node us_server.js (runs the server -- probably want to make into a daemon)

Provide code examples and explanations of how to get the project.

## API Reference

New urls are stored using a POST to /make with arguments you can ferret
out by reverse-engineering the client.

For maintenance and curation, it is expected that adminstrators will
manage the tables directly. There are two tables. One matches the 
urls and their short names. The other is purely a log table for stats.

## User Interface

### Creating Links

User can create/store new URLs by going to '/'. A page will show
a place to enter an URL. Users can optionally enter what they want 
the shortened synonym to be. If they don't one will be generated for them.
If they leave the name blank, the creation will always succeed, but if 
they fill it in and that value is taken, the tool will not create anything
and will instead return the existing link tied to that name.

### Using links

Any GET from /<name> where 'name' is the value generated in the previous
creation step will redirect the user directly and immediately to that 
original url.

If 'name' is not found in the database, an error message is shown and
the user is invited to create the shortened link.

## Contributors

Dave Jacobowitz (david.jacobowitz@gmail.com)

## License

This is released under the GPLv3 open-source license.

