const md = 
`# About this App

This app was converts RINEX files, specifically pseudoranges, to position using a least-squares algorithm. To learn more about how it works, please look below.

## Definitions

RINEX - A data format that contains certain measurements by the GPS reciever.
Pseudorange - A feature of the RINEX data format. It is the approximate distance from the satellite to the reciever.


## How it works

1. A RINEX file is uploaded to the server.
2. A server-side program processes the file.
3. The server-side program finds the time of the observation from the RINEX file.
4. The program finds the location of the satellites during the time of the observation. It does this by retrieving ephemeral from a NASA FTP server.
5. The program now has the location of the satellites and the pseudoranges. It uses a least-squares algorithm to then find X, Y, and Z coordiates.
6. The program sends the calculated coordinates to the client, which then displays the coordinates on a Google Map.

If you want to learn more about the algorithm, please view the presentation below.
`

export default md;