import { styled, Tooltip, tooltipClasses, TooltipProps } from "@mui/material";
import { Link } from "react-router-dom";
import "./Navbottom.css";

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(21),
    border: "1px solid #dadde9",
  },
}));

export default function NavBottom(props: any) {
  return (
    <div className="navbottom" id="navbar">
      <div id="icon-case">

      <Link to="/">
          <HtmlTooltip title="Home Page">
            <i className="mdi mdi-home"></i>
          </HtmlTooltip>
        </Link>

        <a href="https://docs.google.com/presentation/d/1OhiSuxfpeR75B5-2a5aedXSRsKi1ecaLB2Yk64ziM5U/edit?usp=sharing" target="_blank" rel="noreferrer">
          <HtmlTooltip title="View Presentation">
            <i className="mdi mdi-file-presentation-box"></i>
          </HtmlTooltip>
        </a>

        <a href="https://github.com/subatuba21/Rinex-Converter" target="_blank" rel="noreferrer">
          <HtmlTooltip title="View Code">
            <i className="mdi mdi-github"></i>
          </HtmlTooltip>
        </a>

        <Link to="/about">
          <HtmlTooltip title="About This App">
            <i className="mdi mdi-information-outline"></i>
          </HtmlTooltip>
        </Link>
      </div>
    </div>
  );
}
