import React from "react";
function getXY(e){
    let x = 0;
    let y = 0;
    if(e.touches && e.touches.length){
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
    }
    else{
        x = e.pageX;
        y = e.pageY;
    }
    return {x,y}
}
function Cond(props){
    if(!props.condition) return null;
    return (
        <React.Fragment>
            {props.children}
        </React.Fragment>
    );
}
export default class Lightbox extends React.Component {
    moving = false;
    initX  = 0;
    initY  = 0;
    lastX  = 0;
    lastY  = 0;
    state = {
        x       : 0,
        y       : 0,
        zoom    : 1,
        rotate  : 0,
        current : this.props?.startIndex ?? 0,
        multi   : this.props?.images?.length? true: false
    }
    componentWillMount(){
        document.body.classList.add("lb-open-lightbox");
    }
    componentWillUnmount(){
        document.body.classList.remove("lb-open-lightbox");
    }
    createTransform = (x,y,zoom,rotate) => `translate3d(${x}px,${y}px,0px) scale(${zoom}) rotate(${rotate}deg)`;
    stopSideEffect  = (e) => e.stopPropagation();
    preventDefault  = (e) => e.preventDefault();
    getCurrentImage = (s,p) => {
        if(!s.multi) return p.image ?? "";
        return p.images[s.current]?.url ?? p.images?.[s.current] ?? "";
    }
    getCurrentTitle = (s,p)  => {
        if(!s.multi) return p.title ?? "";
        return p.images?.[s.current]?.title ?? "";
    }
    navigateImage = (direction, e) =>{
        this.stopSideEffect(e);
        let current = 0;
        switch(direction){
            case "next":
                current = this.state.current + 1;
                break;
            case "prev":
                current = this.state.current - 1;
                break;
            default:
                console.error("Illegal Invocation");
        }
        if(current >= this.props.images.length) current = 0;
        else if (current < 0) current = this.props.images.length -1;
        this.setState({current, x: 0, y: 0, zoom: 1, rotate: 0});
    }
    startMove = (e) => {
        if(this.state.zoom <= 1) return false;
        this.moving = true;
        this.preventDefault(e);
        let xy = getXY(e);
        this.initX  = xy.x - this.lastX;
        this.initY  = xy.y - this.lastY;
    }
    duringMove = (e) => {
        if(!this.moving) return false;
        this.preventDefault(e);
        let xy = getXY(e);
        this.lastX = xy.x - this.initX;
        this.lastY = xy.y - this.initY;
        this.setState({
            x: xy.x - this.initX,
            y: xy.y - this.initY
        });
    }
    endMove = (e) =>{
        this.preventDefault(e);
        this.moving = false;
    }
    applyZoom = (type) => {
        let {zoomStep = 0.3} = this.props;
        switch(type){
            case "in":
                this.setState({zoom: this.state.zoom + zoomStep});
                break;
            case "out":
                if(this.state.zoom > 1) this.setState({zoom: this.state.zoom - zoomStep});
                else this.setState({x:0,y:0});
                break;
            default:
                console.error("Wrong function invocation");
        }
    }
    applyRotate = (type) => {
        switch(type){
            case "cw":
                this.setState({rotate: this.state.rotate + 90});
                break;
            case "acw":
                this.setState({rotate: this.state.rotate - 90});
                break;
            default:
                console.error("Wrong function invocation");
        }
    }
    reset = e => {
        this.stopSideEffect(e);
        this.setState({x:0,y:0,zoom:1,rotate:0});
    };
    exit  = (e) =>{
        if(typeof this.props.onClose === "function") return this.props.onClose(e);
        console.warn("No Exit function passed on props: onClose");
    }
    canvasClick = (e) => {
        let {clickOutsideToExit = true} = this.props;
        if(clickOutsideToExit) return this.exit(e);
    }
    render(){
        let image = this.getCurrentImage(this.state,this.props);
        let title = this.getCurrentTitle(this.state,this.props);
        let {
            allowZoom   = true,
            allowRotate = true,
            allowReset  = true,
            buttonAlign = "flex-end",
            showTitle   = true
        } = this.props;
        let {x,y,zoom,rotate} = this.state;
        if(!image){
            console.warn("Not showing lightbox because no image(s) was supplied");
            return null;
        }
        return (
            <div className="lb-container">
                <div className="lb-header" style={{justifyContent: buttonAlign}}>
                    <Cond condition = {showTitle && title}>
                        <div className="lb-title"
                        style={{
                            display   : buttonAlign === "center"?"none":"flex",
                            order     : buttonAlign === "flex-start"?"1":"unset"
                        }}>
                            <span title={title} style= {{textAlign : buttonAlign === "flex-start"?"right":"left"}}>{title}</span>
                        </div>  
                    </Cond>
                    <Cond condition = {this.state.multi}>
                        <div title="Previous" className="lb-button prev lb-hide-mobile" onClick={()=>this.navigateImage("prev", e)}></div>
                        <div title="Next" className="lb-button next lb-hide-mobile" onClick={()=>this.navigateImage("next", e)}></div>
                    </Cond>
                    <Cond condition = {allowZoom}>
                        <div title="Zoom In" className="lb-button zoomin" onClick={()=>this.applyZoom("in")}></div>
                        <div title="Zoom Out" className="lb-button zoomout" onClick={()=>this.applyZoom("out")}></div>
                    </Cond>
                    <Cond condition = {allowRotate}>
                        <div title="Rotate left" className="lb-button rotatel" onClick={()=>this.applyRotate("acw")}></div>
                        <div title="Rotate right" className="lb-button rotater" onClick={()=>this.applyRotate("cw")}></div>
                    </Cond>
                    {allowReset?<div title="Reset" className="lb-button lb-hide-mobile reload" onClick={this.reset}></div>:null}
                    <div title="Close" className="lb-button close" style={{order: buttonAlign === "flex-start"?"-1":"unset"}} onClick={e=>this.exit(e)}></div>
                </div>
                <div 
                className="lb-canvas"
                onClick={e=>this.canvasClick(e)}>
                    <img draggable = "false"
                    style={{
                        transform : this.createTransform(x,y,zoom,rotate),
                        cursor    : this.state.zoom > 1? "grab":"unset"
                    }}
                    onMouseDown={e=>this.startMove(e)}
                    onTouchStart={e=>this.startMove(e)}
                    onMouseMove={e=>this.duringMove(e)}
                    onTouchMove={e=>this.duringMove(e)}
                    onMouseUp={e=>this.endMove(e)}
                    onMouseLeave={e=>this.endMove(e)}
                    onTouchEnd={e=>this.endMove(e)}
                    onClick={e=>this.stopSideEffect(e)}
                    className="lb-img"
                    title={title}
                    src={image} alt={title}/>
                    <Cond condition={this.state.multi}>
                        <div className="mobile-controls lb-show-mobile">
                            <div title="Previous" className="lb-button prev" onClick={e=>this.navigateImage("prev", e)}></div>
                            {allowReset?<div title="Reset" className="lb-button reload" onClick={this.reset}></div>:null}
                            <div title="Next" className="lb-button next" onClick={e=>this.navigateImage("next", e)}></div>
                        </div>
                    </Cond>
                </div>
            </div>
        )
    }
}
