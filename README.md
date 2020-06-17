# Gitcoin Bulk Checkout Gas Analysis

Finds Gitcoin bulk checkout transactions where all donations were made in Dai, and for a given
number of donations per transaction it keeps the data point with the highest gasUsed per
number of donations, and plots the data. The resulting plotly dashboard is used to
generate a linear best-fit line.

## Setup

1. Install dependencies with `npm install`
2. Create a [Plotly account](https://chart-studio.plotly.com/settings/api/) and generate an API key
3. Create a file called `.env` that looks like the one below

```bash
PLOTLY_USERNAME=yourUsername
PLOTLY_API_KEY=yourApiKey
```

## Run script

Run `node main.js` in the terminal to execute the script. The output will look similar to the below:

```text
191 Dai-only transactions found
{ streamstatus: undefined,
  url: 'https://chart-studio.plotly.com/~mds1/2',
  message: '',
  warning: '',
  filename: 'donationCount-vs-gasUsed-max',
  error: '' }
{ streamstatus: undefined,
  url: 'https://chart-studio.plotly.com/~mds1/3',
  message: '',
  warning: '',
  filename: 'donationCount-vs-gasUsed-all',
  error: '' }
```

To view the plots, use either of the two `url` links. This opens the plot in Plotly Chart Studio
which also contains tools to edit and analyze the data, including best fit lines
