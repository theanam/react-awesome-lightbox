import React from 'react';

export default function Conditional(props){
    let {condition = true,children=null} = props; 
    if(!condition) return null;
    return (<React.Fragment>
        {children}
    </React.Fragment>);
}
