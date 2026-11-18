// components/UI/SingeMiyo.jsx
// Le singe Miyo des pages de connexion : il cligne des yeux, les ferme quand on tape
// un mot de passe caché, et se fâche quand les informations sont fausses.
import React from 'react';
import './SingeMiyo.css';

function SingeMiyo({ yeuxFermes = false, fache = false, alt = 'Miyo' }) {
    const classes = ['singe-miyo'];
    if (fache) classes.push('fache');
    else if (yeuxFermes) classes.push('yeux-fermes');

    return (
        <div className={classes.join(' ')}>
            <img className="sm-corps" src="/logo/miyo-corps.webp" alt={alt} draggable="false" />
            <img className="sm-yeux" src="/logo/miyo-yeux-fermes.webp" alt="" aria-hidden="true" draggable="false" />
            <img className="sm-fache" src="/logo/miyo-fache.webp" alt="" aria-hidden="true" draggable="false" />
        </div>
    );
}

export default SingeMiyo;
