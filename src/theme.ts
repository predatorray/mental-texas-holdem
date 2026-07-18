import {createTheme} from '@mui/material/styles';

/**
 * Dark casino-style theme. The felt-green radial background is painted by
 * index.css on #root; surfaces here are dark and slightly translucent so the
 * felt shows through.
 */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffc857',
      contrastText: '#1d1d0d',
    },
    secondary: {
      main: '#7ad0a2',
    },
    background: {
      default: '#12281c',
      paper: '#1c3527',
    },
    success: {
      main: '#7ad0a2',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {fontSize: '1.8rem', fontWeight: 800},
    h2: {fontSize: '1.3rem', fontWeight: 700},
    h3: {fontSize: '1.1rem', fontWeight: 700},
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'transparent',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(13, 31, 21, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(4px)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          fontWeight: 700,
          textTransform: 'uppercase',
        },
      },
    },
  },
});

export default theme;
